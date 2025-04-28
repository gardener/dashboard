import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import { readFileSync } from 'node:fs'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'lib/index.js',
    cache: false,
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
    external: getPeerDependencies(),
    plugins: [nodeResolve(), json(), commonjs()],
  },
  {
    input: 'lib/index.js',
    cache: false,
    output: {
      file: 'dist/index.js',
      format: 'esm',
    },
    external: getPeerDependencies(),
    plugins: [nodeResolve(), json(), commonjs()],
  },
]
function getPeerDependencies () {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
  return packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies) : []
}
