import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
    plugins: [nodeResolve(), commonjs()],
  },
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.js',
      format: 'esm',
    },
    plugins: [nodeResolve(), commonjs()],
  },
]
