import { build } from "esbuild";

await build({
  entryPoints: ["src/client-entry.js"],
  outfile: "client.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "DSHModelSearch",
  target: ["safari17"],
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-model-search", factory: () => {'
  },
  footer: {
    js: 'return { apply: DSHModelSearch.apply, inject: DSHModelSearch.inject }; } });'
  },
  legalComments: "none"
});
