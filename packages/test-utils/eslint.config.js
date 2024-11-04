//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginSecurity = require('eslint-plugin-security')
const pluginLodash = require('eslint-plugin-lodash')
const pluginImport = require('eslint-plugin-import')

module.exports = [
  ...neostandard({}),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'no-console': 'error',
      'no-debugger': 'error',
    },
  },
  pluginSecurity.configs.recommended,
  {
    plugins: {
      import: pluginImport,
    },
    rules: pluginImport.flatConfigs.recommended.rules,
  },
  {
    plugins: {
      lodash: pluginLodash,
    },
    rules: {
      'lodash/path-style': ['error', 'array'],
    },
  },
]
