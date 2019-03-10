const rollup = require("rollup/dist/rollup.browser");
const ts = require("typescript/lib/typescriptServices");
const fetch = require("node-fetch");
const fs = require("fs");

async function resolve(id) {
  console.log("FETCH PACKAGE", id);
  const pkg = JSON.parse(await fetch(`https://unpkg.com/${id}/package.json`).then(res => res.text()));

  const href = pkg.module || pkg.main;
  console.log("FETCH SOURCE", id, href);
  
  return [id, await fetch(`https://unpkg.com/${id}/${href}`).then(res => res.text())];
}

function ext(src) {
  const result = src.match(/(?<=\.)([^.\/]+)$/g);

  return result ? result[0] : "";
}
function transpile(code) {
  return ts.transpile(code, {
      "module": "es2015",
      "moduleResolution": "node",
  });
}
function isExternal(src) {
  return src.indexOf(".") !== 0;
}
async function resolveFile(src) {
  if (ext(src)) {
    if (fs) {
      return [src, fs.readFileSync(src, {encoding: "utf-8"})];
    } else {
      return [src, await fetch(src).then(res => res.text())];
    }
  } else {
    if (isTS) {
      try {
        return resolveFile(`${src}.ts`);
      } catch(e) {}
      try {
        return resolveFile(`${src}.tsx`);
      } catch(e) {}
    }
    try {
      return resolveFile(`${src}.js`);
    } catch(e) {}
    try {
      return resolveFile(`${src}.jsx`);
    } catch(e) {}

    throw new Error(`no such file or directory, open '${src}'`);
  }
}
function load(src) {
  if (isExternal(src)) {
    return resolve(src);
  } else {
    return resolveFile(src);
  }
}
// const storage = typeof localStorage === "undefined" ? fs
let isTS = false;

let hashId = 0;
function checkCommonjs(code, isConfig) {
  const regexp1 = /(\S*\s*\S+\s*\=\s*)*require\(\"([^"]+)\"\)/g;

  let result;
  while (result = regexp1.exec(code)) {
    const input = result[0];
    const declarator = result[1];
    const module = result[2];
    const moduleId = "commonjs_" + hashId;

    ++hashId;
    code = code.replace(input, `
    import ${moduleId} from "${module}";
    ${declarator} ${moduleId}
    `);
  }
  const regexp2 = /^import\s*[^{\n]*\{([^}]*)}\s*from\s*"([^"]+)";/mg;

  while (result = regexp2.exec(code)) {
    if (result[2].indexOf("rollup-") > -1) {
      const modules = result[1].split(/(?:\s*,\s*|(?:\s*\S+\s*as\s*))+/g)
      code = code.replace(result[0], modules.map(module => `const ${module} = () => undefined;`).join(""));
    }
  }
  code = code.replace(/module\.exports\s*\=\s/g, "export default ");

  return code;
}
function resolvePath(path1, path2) {
  let path = path1.split("/").slice(0, -1).concat(path2.split("/"));

  path = path.filter((directory, i) => i === 0 || directory !== ".");

  let index = -1

  while ((index = path.indexOf("..")) > 0) {
    path.splice(index - 1, 2);
  }
  return path.join("/");
}
function getConfig(input) {
  return {
    ...input,
    plugins: [
      {
        resolveId: (e, a, b, c, d) => {
          if (ext(e).indexOf("ts") > -1) {
            isTS = true;
          }
          if (!isExternal(e) && a) {
           return resolvePath(a, e);
          } else if (isExternal(e) && !a) {
            return "./" + e;
          }
          return e
        },
        load: async e => {
          if (e.indexOf("rollup-") > -1)  {
            return "export default () => undefined";
          }
          let [filename, code] = await load(e);

          console.log("LOAD", filename);
          if (ext(filename) === "json") {
            return `export default ${code}`;
          }
          code = checkCommonjs(code);

          if (ext(filename).indexOf("ts") > -1) {
            return transpile(code);
          }
          
          return code;
        }
      },
    ]
  }
}

exports.config = async function () {
  var config = (await exports.generate({
    input: "./rollup.config.1.js"
  }, {
    format: "iife",
    name: "config",
  })).code;

  return eval(`${config} config;`);
}
exports.start = async function(filename = "./rollup.config.js") {
  const configs = await exports.config(filename);

  function start(config) {
    const {output, ...input} = config;
  
    return exports.generate(input, output);
  }
  return Array.isArray(configs) ? configs.map(config => {
   return start(config);
  }) : [start(configs)];
}

exports.generate = async function generate(inputConfig, outputConfig = {}) {
  const output = await rollup.rollup(getConfig(inputConfig));

  const result = await output.generate({
    format: "esm",
    freeze: false,
    ...outputConfig,
    sourcemap: false,
  });

  return {
    file: outputConfig.file,
    fileName: result.output[0].fileName,
    code: result.output[0].code,
  }
}
