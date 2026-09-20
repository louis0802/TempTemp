import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError || error instanceof SyntaxError)
    return json({ error: "Please check the submitted values." }, 400);
  console.error(
    JSON.stringify({
      event: "request_failed",
      type: error instanceof Error ? error.name : "unknown",
    }),
  );
  return json(
    { error: "This service is unavailable. Please try again shortly." },
    503,
  );
}

export async function readJson(req: Request, maxBytes = 200_000) {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes)
    throw new HttpError(413, "Request exceeds the size limit.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new HttpError(413, "Request exceeds the size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
