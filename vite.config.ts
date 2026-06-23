// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const rpcWsPkg = require.resolve("rpc-websockets/package.json");
const rpcWsDir = dirname(rpcWsPkg);
const rpcWsBrowser = join(rpcWsDir, "dist/index.browser.mjs");
const rpcWsNode = join(rpcWsDir, "dist/index.mjs");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // rpc-websockets exports map only declares "browser" and "node" — workerd
        // and the client build both fail to resolve "." cleanly. Alias to the actual files.
        {
          find: /^rpc-websockets$/,
          replacement: typeof globalThis.window === "undefined" ? rpcWsNode : rpcWsBrowser,
        },
      ],
    },
  },
});
