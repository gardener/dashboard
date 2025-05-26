import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import fs from 'fs'
import path from 'path'

// Recursively collect all .js files in lib/
function getAllJsFiles (dir) {
  let results = []
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(getAllJsFiles(filePath))
    } else if (filePath.endsWith('.js')) {
      results.push(filePath)
    }
  }
  return results
}

const inputFiles = getAllJsFiles('./lib')

export default [{
  input: inputFiles,
  output: {
    dir: './lib-cjs',
    format: 'cjs',
    exports: 'auto',
    preserveModules: true,
    preserveModulesRoot: 'lib',
  },
  plugins: [nodeResolve(), json(), commonjs()],
  external: [],
  treeshake: false,
}]
