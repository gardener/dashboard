//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'

export default [
  {
    input: 'server.js',
    cache: false,
    output: {
      dir: `${process.cwd()}/dist/`,
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
          { src: 'package.json', dest: `${process.cwd()}/dist/` },
        ],
      }),
    ],
  },
]
