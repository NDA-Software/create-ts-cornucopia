import nodeResolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";
import copy from "rollup-plugin-copy";

export default [{
    input: "src/index.ts",
    output: [{
        exports: "named",
        dir: "dist/",
        format: "cjs"
    }],
    plugins: [
        typescript({ tsconfig: "tsconfig.json" }),
        nodeResolve(),
        peerDepsExternal(),
        json(),
        copy({
            targets: [
                { src: 'src/templates/', dest: "dist/" }
            ],
            recursive: true
        })
    ],
}];
