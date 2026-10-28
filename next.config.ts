import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: process.env.AUTH_URL
    ? [new URL(process.env.AUTH_URL).hostname]
    : [],
};
export default config;
