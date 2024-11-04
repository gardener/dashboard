//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginJest = require('eslint-plugin-jest')
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
  {
    files: [
      '**/__fixtures__/**',
      '**/__mocks__/**',
      '**/__tests__/**',
      '**/jest.setup.js',
    ],
    plugins: {
      jest: pluginJest,
    },
    languageOptions: {
      globals: {
        ...pluginJest.environments.globals.globals,
        fixtures: 'readonly',
        createAgent: 'readonly',
      },
    },
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
]
