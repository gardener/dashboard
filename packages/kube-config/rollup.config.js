import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default [
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
    plugins: [nodeResolve(), commonjs(), json()],
  },
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.js',
      format: 'esm',
    },
    plugins: [nodeResolve(), commonjs(), json()],
  },
]
