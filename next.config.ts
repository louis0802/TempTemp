import type { NextConfig } from "next";

const config: NextConfig = {
  // Local product inspection uses localhost; Playwright uses 127.0.0.1.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};
export default config;
