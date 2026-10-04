import { describe, it, expect } from "vitest";
import ts from "typescript";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { contentHash } from "@/ingestion/direct-sources/evidence";

async function dependencyClosure(entry: string) {
  const files = new Map<string, string>(),
    packages = new Set<string>();
  async function walk(file: string): Promise<void> {
    if (files.has(file)) return;
    const text = await readFile(file, "utf8");
    files.set(file, text);
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const dependencies: string[] = [];
    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        dependencies.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        ts.isStringLiteral(node.arguments[0])
      )
        dependencies.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    for (const spec of dependencies) {
      if (spec.startsWith(".") || spec.startsWith("@/")) {
        const base = spec.startsWith("@/")
          ? path.resolve("src", spec.slice(2))
          : path.resolve(path.dirname(file), spec);
        let next = base + ".ts";
        try {
          await readFile(next);
        } catch {
          next = path.join(base, "index.ts");
        }
        await walk(next);
      } else packages.add(spec);
    }
  }
  await walk(path.resolve(entry));
  return { files, packages };
}
describe("direct runtime architectural isolation", () => {
  it("ingest dependency closure has no collector/parser/signals or legacy table queries", async () => {
    const { files } = await dependencyClosure(
      "scripts/direct-source-ingest.ts",
    );
    expect([...files.keys()].join("\n")).not.toMatch(
      /ingestion\/(?:live|service|worker|parser|sources\/telegram|resolution\/(?:pipeline|signals|parser))\b/,
    );
    expect([...files.keys()].join("\n")).not.toMatch(
      /scripts\/research\/(?:merchant-source-map|build-merchant-source-map)/,
    );
    for (const [file, text] of files) {
      expect(text, file).not.toMatch(
        /\b(?:FROM|JOIN|INSERT INTO|UPDATE|DELETE FROM)\s+app\.(?:source_posts|post_revisions|candidates|promotion_sources)\b/i,
      );
      expect(text, file).not.toMatch(
        /PostOfferParser|PromotionSignal|TelegramCollector/,
      );
    }
  });
  it("preview remains DB/publication-free", async () => {
    const { files, packages } = await dependencyClosure(
      "scripts/direct-source-preview.ts",
    );
    expect([...files.keys()].join("\n")).not.toMatch(
      /\/server\/|\/persistence\.ts|\/publication\.ts|\/publish-store\.ts/,
    );
    expect(packages.has("pg")).toBe(false);
  });
  it("scheduler/worker/application startup do not import autonomous ingestion", async () => {
    const roots = [
      "src/ingestion/worker.ts",
      "src/ingestion/runner.ts",
      "src/app/layout.tsx",
      "scripts/research/source-monitor-worker.ts",
    ];
    for (const entry of roots) {
      const text = await readFile(entry, "utf8");
      expect(text, entry).not.toMatch(
        /direct-source-ingest|direct-sources\/(?:persistence|review|runner)|persistDirectSourceRun/,
      );
    }
  });
  it("legacy live/runtime and protected production/research files retain their frozen bytes", async () => {
    const expected = JSON.parse(
      await readFile(
        "tests/fixtures/direct-sources/protected-production-hashes.json",
        "utf8",
      ),
    ) as Record<string, string>;
    for (const [file, hash] of Object.entries(expected)) {
      if (file === "src/domain/promotion.ts") continue; // Explicit schema extension has separate compatibility coverage.
      expect(contentHash(await readFile(file)), file).toBe(hash);
    }
  });
  it("both origins retain distinct admin labels/links and route dispatch", async () => {
    const text = await readFile("src/app/admin/page.tsx", "utf8");
    expect(text).toContain('"Direct source"');
    expect(text).toContain('"Telegram signal"');
    expect(text).toContain('"Open official source ↗"');
    expect(text).toContain('"Open original post ↗"');
    expect(text).toContain('"direct-candidates"');
  });
});
