//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginVitest = require('@vitest/eslint-plugin')
const pluginLodash = require('eslint-plugin-lodash')
const pluginImport = require('eslint-plugin-import')

module.exports = [
  ...neostandard({}),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'no-console': 'error',
    },
  },
  {
    settings: {
      'import/resolver': {
        [require.resolve('../eslint-import-resolver-local.cjs')]: {
          map: [
            ['@gardener-dashboard/test-utils', '../packages/test-utils'],
          ],
        },
        node: {
          extensions: ['.js', '.cjs', '.mjs'],
        },
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      ...pluginImport.flatConfigs.recommended.rules,
      'import/no-named-as-default-member': 'off',
    },
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
      '**/vitest.setup.js',
    ],
    plugins: {
      vitest: pluginVitest,
    },
    languageOptions: {
      globals: {
        ...pluginVitest.environments.env.globals,
        fixtures: true,
      },
    },
    rules: {
      ...pluginVitest.configs.recommended.rules,
      'vitest/no-disabled-tests': 'warn',
    },
  },
  {
    files: ['**/vitest.config.js'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]
