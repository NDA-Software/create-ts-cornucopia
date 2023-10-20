import { existsSync, mkdirSync, writeFileSync } from "fs";

import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import peerDepsExternal from "rollup-plugin-peer-deps-external";
import json from "rollup-plugin-json";
import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";

import packageJson from "./package.json" assert { type: "json" };

const tempFolder = ".temp"
if (!existsSync(tempFolder))
    mkdirSync(tempFolder);

const mockFile = `${tempFolder}/mock.js`;
if (!existsSync(mockFile))
    writeFileSync(mockFile, "export default () => 42;");

const mockConfig = {
    input: ".temp/mock.js",
    output: [{ dir: ".temp/", }],
};

const { main, exports, typesVersions } = packageJson;

const config = [];
const sharedConfigs = {
    input: "src/index.ts",
    plugins: [
        nodeResolve(),
        peerDepsExternal(),
        json(),
    ],
};

if (main)
    config.push({
        ...sharedConfigs,
        output: [{
            exports: "named",
            dir: "dist/",
            format: "cjs"
        }],
        plugins: [
            ...sharedConfigs.plugins,
            typescript({ tsconfig: "tsconfig.json", declaration: true, declarationDir: "./dist/types/" }),
            copy({
                targets: [{
                    src: 'src/templates/',
                    dest: "dist/"
                }],
                recursive: true
            })
        ],
    });

if (exports) {
    let folder = "dist/"
    let declaration = true;
    let declarationDir = "./dist/types/";

    if (main) {
        folder = "dist/esm/"
        declaration = false;
        declarationDir = undefined;

        config.push({
            ...mockConfig,
            plugins: [
                copy({
                    targets: [
                        { src: ['dist/*', '!dist/cjs'], dest: "dist/cjs/" },
                        { src: "dist/types/src/*", dest: "dist/types" }
                    ]
                })
            ],
        });

        config.push({
            ...mockConfig,
            plugins: [
                del({
                    targets: ["dist/cjs/types", "dist/*", "!dist/cjs", "!dist/types"],
                    recursive: true
                }),
                del({
                    targets: ["dist/types/src"],
                    recursive: true
                })
            ],
        });
    }

    config.push({
        ...sharedConfigs,
        output: [{
            exports: "named",
            dir: folder,
            format: "esm"
        }],
        plugins: [
            ...sharedConfigs.plugins,
            typescript({ tsconfig: "tsconfig.json", declaration, declarationDir }),
            copy({
                targets: [{
                    src: 'src/templates/',
                    dest: folder
                }],
                recursive: true
            })
        ],
    });
}

if (typesVersions && typesVersions["*"]) {
    for (const key of Object.keys(typesVersions["*"])) {

    }
}

console.log(config);

export default config;
