import { existsSync, mkdirSync, writeFileSync } from 'fs'
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import copy from 'rollup-plugin-copy'

if (!existsSync('./.temp/dummy.js')) {
    mkdirSync('./.temp/')

    writeFileSync(
        './.temp/dummy.js',
        'export const dummy = () => console.log(42);'
    )
}

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                exports: 'named',
                preserveModules: true,
                interop: 'auto',
                dir: '.build/',
                format: 'cjs'
            }
        ],
        plugins: [
            typescript({
                tsconfig: 'tsconfig.json',
                outDir: '.build/',
                include: ['./src/**/*.ts']
            }),
            nodeResolve(),
            peerDepsExternal(),
            copy({
                targets: [{ src: './package.json', dest: './.build/templates/' }]
            })
        ]
    }
]
