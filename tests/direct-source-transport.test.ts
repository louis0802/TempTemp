import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const { requestMock, lookupMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  lookupMock: vi.fn(),
}));
vi.mock("node:http", () => ({ request: requestMock }));
vi.mock("node:https", () => ({ request: requestMock }));
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));
import {
  AcquisitionFailure,
  nodeBodyTransport,
  USER_AGENT,
} from "../src/ingestion/direct-sources/fetch";
beforeEach(() => {
  requestMock.mockReset();
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
function respond(
  headers: Record<string, string>,
  chunks: string[],
  status = 200,
) {
  let destroyed = false;
  const response = Object.assign(new EventEmitter(), {
    statusCode: status,
    headers,
    destroy: vi.fn(() => {
      destroyed = true;
    }),
  });
  const req = Object.assign(new EventEmitter(), {
    end: vi.fn(),
    destroy: vi.fn(),
  });
  requestMock.mockImplementation((_url, _options, callback) => {
    req.end.mockImplementation(() => {
      callback(response);
      queueMicrotask(() => {
        for (const chunk of chunks) {
          if (destroyed) break;
          response.emit("data", Buffer.from(chunk));
        }
        if (!destroyed) response.emit("end");
      });
    });
    return req;
  });
  return { req, response };
}
it("pins validated public DNS and exposes only named public GET headers, no cookies/auth", async () => {
  respond({ "content-type": "text/html" }, ["hello", " world"]);
  const signal = new AbortController().signal;
  const r = await nodeBodyTransport(
    new URL("https://www.pepperlunch.com.sg/promo/"),
    signal,
    100,
  );
  expect(r.body.toString()).toBe("hello world");
  const [url, options] = requestMock.mock.calls[0];
  expect(url.hostname).toBe("www.pepperlunch.com.sg");
  expect(options).toMatchObject({
    method: "GET",
    agent: false,
    maxHeaderSize: 16384,
    signal,
    headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "identity" },
  });
  expect(Object.keys(options.headers).sort()).toEqual([
    "Accept",
    "Accept-Encoding",
    "User-Agent",
  ]);
  const callback = vi.fn();
  options.lookup(url.hostname, { all: false }, callback);
  expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
  const all = vi.fn();
  options.lookup(url.hostname, { all: true }, all);
  expect(all).toHaveBeenCalledWith(null, [
    { address: "93.184.216.34", family: 4 },
  ]);
});
it("rejects any private DNS answer before body transport, including mixed public/private sets", async () => {
  lookupMock.mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ]);
  await expect(
    nodeBodyTransport(
      new URL("https://www.pepperlunch.com.sg/promo/"),
      new AbortController().signal,
      10,
    ),
  ).rejects.toThrow("non_public_dns_address");
  expect(requestMock).not.toHaveBeenCalled();
});
it("stream-bounds oversized chunked responses without retaining/truncating them as usable evidence", async () => {
  const { response, req } = respond({ "content-type": "text/html" }, [
    "abc",
    "def",
    "ghi",
  ]);
  await expect(
    nodeBodyTransport(
      new URL("https://www.pepperlunch.com.sg/promo/"),
      new AbortController().signal,
      5,
    ),
  ).rejects.toMatchObject({ message: "response_too_large", httpStatus: 200 });
  expect(response.destroy).toHaveBeenCalled();
  expect(req.destroy).toHaveBeenCalled();
});
it("rejects oversized Content-Length before reading bytes while retaining known status", async () => {
  const { response } = respond(
    { "content-type": "application/pdf", "content-length": "1000" },
    ["body"],
  );
  try {
    await nodeBodyTransport(
      new URL("https://www.paradisegp.com/menu.pdf"),
      new AbortController().signal,
      5,
    );
    throw new Error("expected size rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(AcquisitionFailure);
    expect(error).toMatchObject({
      httpStatus: 200,
      contentType: "application/pdf",
      message: "response_too_large",
    });
  }
  expect(response.destroy).toHaveBeenCalled();
});
it("does not consume redirect bodies or silently enable compression", async () => {
  const { response } = respond(
    { location: "https://evil.example/" },
    ["must not read"],
    302,
  );
  const r = await nodeBodyTransport(
    new URL("https://www.paradisegp.com/"),
    new AbortController().signal,
    5,
  );
  expect(r.body.length).toBe(0);
  expect(response.destroy).toHaveBeenCalled();
  respond({ "content-encoding": "gzip" }, ["compressed"]);
  await expect(
    nodeBodyTransport(
      new URL("https://www.paradisegp.com/"),
      new AbortController().signal,
      100,
    ),
  ).rejects.toThrow("unsupported_content_encoding");
});
