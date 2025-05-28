//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'server.js',
    cache: false,
    output: {
      dir: `${process.cwd()}/dist/`,
      format: 'cjs',
      preserveModules: true,
      entryFileNames: '[name].cjs',
    },
    plugins: [
      nodeResolve(),
      json(),
      commonjs(),
    ],
  },
]
