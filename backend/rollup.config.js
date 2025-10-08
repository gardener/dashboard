//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import { fileURLToPath } from 'url'
import {
  dirname,
  resolve,
} from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default [
  {
    input: 'server.js',
    cache: false,
    output: {
      dir: resolve(__dirname, 'dist'),
      format: 'cjs',
      preserveModules: true,
      entryFileNames: '[name].cjs',
      paths: {
        'lodash-es': 'lodash',
      },
    },
    plugins: [
      json(),
      commonjs(),
      copy({
        targets: [
          { src: 'package.json', dest: resolve(__dirname, 'dist') },
        ],
      }),
    ],
  },
]
