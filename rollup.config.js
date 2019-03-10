const banner = require("./banner");
const resolve = require("rollup-plugin-node-resolve");
const commonjs = require("rollup-plugin-commonjs");

export default {
  plugins: [commonjs(), resolve()],
  external: ["node-fetch", "fs", "path", "os", "crypto", "buffer", "source-map-support"],
  input: "index.js",
  output: {
    file: "browser.js",
    globals: {
      "fs": "fs",
      "path": "path",
      "os": "os",
      "crypto": "crypto",
      "buffer": "buffer",
      "source-map-support": "source-map-support",
      "node-fetch" : "fetch",
    },
    banner,
    name: "bundler",
    format: "umd",
    freeze: false,
    exports: "default",
    interop: false,
    sourcemap: true,
  },
};