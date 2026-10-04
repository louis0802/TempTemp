/** Durable, file-only storage for the isolated source discovery service. */
import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";

export type JsonValidator<T> = (value: unknown) => value is T;
export type WriteOptions = { root?: string };
export type SealManifest = {
  sha256: Record<string, string>;
  supporting_sha256?: Record<string, string>;
  [key: string]: unknown;
};

const errorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;
const isMissing = (error: unknown) => errorCode(error) === "ENOENT";
const isExisting = (error: unknown) => errorCode(error) === "EEXIST";
const hexDigest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

function contained(root: string, target: string) {
  const relative = path.relative(root, target);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function exists(filename: string) {
  try {
    await lstat(filename);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

async function syncDirectory(directory: string) {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function assertWritableTarget(filename: string, options: WriteOptions) {
  const target = path.resolve(filename);
  const root = options.root
    ? path.resolve(options.root)
    : path.parse(target).root;
  if (options.root && !contained(root, target))
    throw new Error(`Research write escapes data root: ${target}`);
  if (path.basename(target) === "SEALED")
    throw new Error("Use writeNewJson to create a seal");

  let directory = path.dirname(target);
  for (;;) {
    if (await exists(path.join(directory, "SEALED")))
      throw new Error(`Research interval is sealed: ${directory}`);
    if (directory === root) break;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  if (options.root) {
    await mkdir(root, { recursive: true });
    const realRoot = await realpath(root);
    let existingParent = path.dirname(target);
    while (!(await exists(existingParent)) && existingParent !== root)
      existingParent = path.dirname(existingParent);
    const realExistingParent = await realpath(existingParent);
    if (
      realExistingParent !== realRoot &&
      !contained(realRoot, realExistingParent)
    ) {
      throw new Error(
        `Research write escapes data root through symlink: ${target}`,
      );
    }
  }
  await mkdir(path.dirname(target), { recursive: true });
  if (options.root) {
    const realRoot = await realpath(root);
    const realParent = await realpath(path.dirname(target));
    if (realParent !== realRoot && !contained(realRoot, realParent))
      throw new Error(
        `Research write escapes data root through symlink: ${target}`,
      );
  }
  return target;
}

async function temporaryJson(target: string, value: unknown) {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined)
    throw new TypeError(`Cannot serialize research JSON: ${target}`);
  const filename = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );
  const handle = await open(filename, "wx", 0o600);
  try {
    await handle.writeFile(`${serialized}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(filename).catch(() => undefined);
    throw error;
  }
  await handle.close();
  return filename;
}

/** Replace one unsealed JSON file without ever exposing a partial value. */
export async function atomicWriteJson(
  filename: string,
  value: unknown,
  options: WriteOptions = {},
) {
  const target = await assertWritableTarget(filename, options);
  const temporary = await temporaryJson(target, value);
  try {
    await assertWritableTarget(target, options);
    await rename(temporary, target);
    await syncDirectory(path.dirname(target));
  } finally {
    await unlink(temporary).catch((error) => {
      if (!isMissing(error)) throw error;
    });
  }
}

/** Create an immutable input or artifact; an existing path is never replaced. */
export async function writeNewJson(
  filename: string,
  value: unknown,
  options: WriteOptions = {},
) {
  const target = path.resolve(filename);
  if (path.basename(target) === "SEALED") {
    const manifest = await assertWritableTarget(
      path.join(path.dirname(target), "manifest.json"),
      options,
    );
    const digest =
      value && typeof value === "object"
        ? (value as Record<string, unknown>).manifest_sha256
        : null;
    if (!hexDigest(digest) || (await sha256File(manifest)) !== digest)
      throw new Error("Research seal needs the current manifest hash");
  } else {
    await assertWritableTarget(target, options);
  }
  const temporary = await temporaryJson(target, value);
  try {
    if (path.basename(target) !== "SEALED")
      await assertWritableTarget(target, options);
    await link(temporary, target);
    await unlink(temporary);
    await syncDirectory(path.dirname(target));
  } finally {
    await unlink(temporary).catch((error) => {
      if (!isMissing(error)) throw error;
    });
  }
}

/** Parse only the named JSON file, never a sibling interrupted-write temp file. */
export async function readJsonValidated<T>(
  filename: string,
  validate: JsonValidator<T>,
): Promise<T> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read valid JSON from ${filename}`, {
      cause: error,
    });
  }
  if (!validate(value))
    throw new Error(`Invalid research JSON schema: ${filename}`);
  return value;
}

export async function sha256File(filename: string) {
  return createHash("sha256")
    .update(await readFile(filename))
    .digest("hex");
}

function sealManifest(value: unknown): value is SealManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  const primary = manifest.sha256;
  const supporting = manifest.supporting_sha256;
  const record = (v: unknown) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v).every(hexDigest);
  return (
    record(primary) &&
    Object.keys(primary as object).length > 0 &&
    (supporting === undefined || record(supporting))
  );
}

function sealedFile(runDirectory: string, relative: string) {
  if (!relative || path.isAbsolute(relative))
    throw new Error(`Invalid sealed file path: ${relative}`);
  const absolute = path.resolve(runDirectory, relative);
  if (!contained(runDirectory, absolute))
    throw new Error(`Sealed file escapes run directory: ${relative}`);
  return absolute;
}

/** Verify the seal, manifest and every declared immutable artifact. */
export async function verifySeal(runDirectory: string): Promise<SealManifest> {
  const directory = path.resolve(runDirectory);
  const realDirectory = await realpath(directory);
  if (!(await lstat(path.join(directory, "SEALED"))).isFile())
    throw new Error("Research seal is not a regular file");
  const seal = await readJsonValidated(
    path.join(directory, "SEALED"),
    (value): value is { manifest_sha256: string } =>
      !!value &&
      typeof value === "object" &&
      hexDigest((value as Record<string, unknown>).manifest_sha256),
  );
  const manifestPath = path.join(directory, "manifest.json");
  if (!(await lstat(manifestPath)).isFile())
    throw new Error("Research manifest is not a regular file");
  if ((await sha256File(manifestPath)) !== seal.manifest_sha256)
    throw new Error("Research manifest seal mismatch");
  const manifest = await readJsonValidated(manifestPath, sealManifest);
  const primary = Object.entries(manifest.sha256);
  const supporting = Object.entries(manifest.supporting_sha256 ?? {});
  for (const [relative, digest] of [...primary, ...supporting]) {
    const filename = sealedFile(directory, relative);
    const metadata = await lstat(filename);
    const actual = await realpath(filename);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      !contained(realDirectory, actual) ||
      (await sha256File(filename)) !== digest
    ) {
      throw new Error(`Research sealed file changed: ${relative}`);
    }
  }
  return manifest;
}

type LockRecord = { pid: number; token: string; started_at: string };
const lockRecord = (value: unknown): value is LockRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(record.pid) &&
    Number(record.pid) > 0 &&
    typeof record.token === "string" &&
    typeof record.started_at === "string"
  );
};

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    if ((error as NodeJS.ErrnoException).code === "EPERM") return true;
    throw error;
  }
}

/** One active service writer per data root; a dead PID's lock is recoverable. */
export async function withProcessLock<T>(
  root: string,
  action: () => Promise<T>,
): Promise<T> {
  const directory = path.resolve(root);
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, "service.lock");
  const owner: LockRecord = {
    pid: process.pid,
    token: randomUUID(),
    started_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await writeNewJson(filename, owner, { root: directory });
      break;
    } catch (error) {
      if (!isExisting(error)) throw error;
      const previous = await readJsonValidated(filename, lockRecord).catch(
        (readError) => {
          if (isMissing((readError as Error).cause)) return null;
          throw readError;
        },
      );
      if (!previous) continue;
      if (processAlive(previous.pid))
        throw new Error(
          `Research service already locked by PID ${previous.pid}`,
        );
      const before = await lstat(filename).catch((statError) => {
        if (isMissing(statError)) return null;
        throw statError;
      });
      if (!before) continue;
      const currentOwner = await readJsonValidated(filename, lockRecord).catch(
        (readError) => {
          if (isMissing((readError as Error).cause)) return null;
          throw readError;
        },
      );
      const current = await lstat(filename).catch((error) => {
        if (isMissing(error)) return null;
        throw error;
      });
      if (
        currentOwner?.token === previous.token &&
        current &&
        current.ino === before.ino &&
        current.dev === before.dev
      ) {
        await unlink(filename).catch((error) => {
          if (!isMissing(error)) throw error;
        });
        await syncDirectory(directory);
      }
      if (attempt === 2)
        throw new Error("Could not recover stale research lock");
    }
  }
  try {
    return await action();
  } finally {
    const current = await readJsonValidated(filename, lockRecord).catch(
      (error) => {
        if (isMissing((error as Error).cause)) return null;
        throw error;
      },
    );
    if (current?.token === owner.token) {
      await unlink(filename);
      await syncDirectory(directory);
    }
  }
}
