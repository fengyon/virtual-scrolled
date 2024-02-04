import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import json from "@rollup/plugin-json";
// import babel from '@rollup/plugin-babel')
// import { cleandir } from 'rollup-plugin-cleandir')
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
// import externals from "rollup-plugin-node-externals";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import alias from "@rollup/plugin-alias";
import replace from "@rollup/plugin-replace";

const dirs = fs
  .readdirSync(path.resolve(fileURLToPath(import.meta.url), "../packages"))
  .map((dirName) =>
    path.join(fileURLToPath(import.meta.url), "../packages", dirName)
  );
const formatVar = (varName) =>
  varName.replace(/[-_]+[a-zA-Z]/g, (matched) =>
    matched.replace(/^[-_]+/, "").toUpperCase()
  );
const resolveEntryForPkg = (p) =>
  path.resolve(fileURLToPath(import.meta.url), `../packages/${p}/src/index.ts`);
const entries = {
  "@virtual-scrolled/core": resolveEntryForPkg("core"),
  "@virtual-scrolled/vue3": resolveEntryForPkg("vue3"),
};

export default dirs
  .map((dir) => [
    {
      input: path.join(dir, "src/index.ts"),
      output: {
        file: path.join(dir, "dist/index.esm.js"),
        format: "esm",
        sourcemap: true,
      },
    },
    {
      input: path.join(dir, "src/index.ts"),
      output: {
        file: path.join(dir, "dist/index.umd.js"),
        format: "umd",
        name: formatVar(`VirtualScroller-${path.dirname(dir)}`),
        globals: {
          "@virtual-scrolled/core": "VirtualScrolledCore",
          "@virtual-scrolled/vue3": "VirtualScrolledVue3",
          vue: "Vue",
          react: "React",
        },
        sourcemap: true,
      },
    },
    {
      input: path.join(dir, "src/index.ts"),
      output: {
        file: path.join(dir, "dist/index.cjs.js"),
        format: "cjs",
        sourcemap: true,
      },
    },
  ])
  .flat()
  .map((item) => ({
    plugins: [
      // 自动将dependencies依赖声明为外部依赖
      // externals({ devDeps: false }),
      json(),
      alias({
        entries,
      }),
      replace({
        values: {
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.platform": '""',
          "process.stdout": "null",
        },
        preventAssignment: true,
      }),
      typescript({
        sourceMap: true,
      }),
      nodeResolve({
        extensions: [".js", ".ts", ".json"],
        modulesOnly: true,
        preferredBuiltins: false,
      }),
      commonjs({ extensions: [".js", ".ts"] }), // the ".ts" extension is required
      terser({
        module: /^esm/.test(item.output.format),
        compress: {
          ecma: 2015,
          pure_getters: true,
        },
        safari10: true,
        sourceMap: true,
      }),
    ],
    external: ["vue", "react"],
    ...item,
  }));
