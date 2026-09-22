import { it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("node:http", () => ({ request: requestMock }));
vi.mock("node:https", () => ({ request: requestMock }));
import { nodeTransport } from "../src/ingestion/source-evidence/resolver";
it("native transport pins DNS, bounds headers, discards GET bodies and exposes no caller headers", async () => {
  const response = { statusCode: 200, headers: {}, destroy: vi.fn() };
  const req = Object.assign(new EventEmitter(), {
    end: vi.fn(),
    destroy: vi.fn(),
  });
  requestMock.mockImplementation((_url, _options, callback) => {
    req.end.mockImplementation(() => callback(response));
    return req;
  });
  const signal = new AbortController().signal;
  await nodeTransport.request(
    new URL("https://merchant.example/promo"),
    "GET",
    { address: "93.184.216.34", family: 4 },
    signal,
  );
  const [url, options] = requestMock.mock.calls[0];
  expect(url.hostname).toBe("merchant.example");
  expect(options).toMatchObject({
    method: "GET",
    agent: false,
    maxHeaderSize: 16384,
    signal,
    headers: { Range: "bytes=0-1023", "Accept-Encoding": "identity" },
  });
  expect(Object.keys(options.headers).sort()).toEqual([
    "Accept-Encoding",
    "Range",
  ]);
  const callback = vi.fn();
  options.lookup("merchant.example", { all: false }, callback);
  expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
  const all = vi.fn();
  options.lookup("merchant.example", { all: true }, all);
  expect(all).toHaveBeenCalledWith(null, [
    { address: "93.184.216.34", family: 4 },
  ]);
  expect(response.destroy).toHaveBeenCalledOnce();
  expect(req.destroy).toHaveBeenCalledOnce();
});
