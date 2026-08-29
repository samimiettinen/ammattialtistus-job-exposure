import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Pin to this app directory. A parent /Users/.../Dev/package-lock.json otherwise
// makes Next infer that folder as the workspace root; Turbopack then watches
// every sibling project and the dev server can OOM.
// Next transpiles next.config.ts to CJS, so __dirname is the documented root.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default withNextIntl(nextConfig);
