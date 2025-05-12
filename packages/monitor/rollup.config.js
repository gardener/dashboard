//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import { readFileSync } from 'node:fs'

function getOutputDir () {
  const arg = process.argv.find(a => a.startsWith('--output-dir='))
  if (arg) return arg.replace('--output-dir=', '')
  return process.cwd() + '/dist'
}

export default [
  {
    input: `${process.cwd()}/lib/index.js`,
    cache: false,
    output: {
      file: `${getOutputDir()}/index.cjs`,
      format: 'cjs',
    },
    external: getPeerDependencies(readFileSync),
    plugins: [
      nodeResolve(),
      json(),
      commonjs(),
    ],
  },
  {
    input: `${process.cwd()}/lib/index.js`,
    cache: false,
    output: {
      file: `${getOutputDir()}/index.js`,
      format: 'esm',
    },
    external: getPeerDependencies(),
    plugins: [
      nodeResolve(),
      json(),
      commonjs(),
    ],
  },
]

function getPeerDependencies () {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
  return packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies) : []
}
