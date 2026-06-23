// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // rpc-websockets only declares "browser" and "node" export conditions; workerd build can't resolve it.
        { find: /^rpc-websockets$/, replacement: "rpc-websockets/dist/index.mjs" },
        { find: /^rpc-websockets\/dist\/(.*)$/, replacement: "rpc-websockets/dist/$1" },
      ],
    },
  },
});
