import { existsSync, mkdirSync, writeFileSync } from "fs";

import nodeResolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

if (!existsSync("./.temp/dummy.js")) {
    mkdirSync("./.temp/");

    writeFileSync(
        "./.temp/dummy.js",
        "export const dummy = () => console.log(42);"
    );
}

export default [{
    input: "src/index.ts",
    output: [
        {
            exports: "named",
            dir: "dist/",
            format: "cjs"
        },
    ],
    plugins: [
        typescript({ tsconfig: "tsconfig.json" }),
        nodeResolve(),
        peerDepsExternal(),
        json(),
    ],
}];
