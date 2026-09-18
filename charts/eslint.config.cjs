//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginVitest = require('@vitest/eslint-plugin')
const pluginLodash = require('eslint-plugin-lodash')
const path = require('path')
const pluginImport = require('eslint-plugin-import-x')

const workspacePackageMap = new Map([
  ['@gardener-dashboard/test-utils', '../packages/test-utils'],
])

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
      'import-x/resolver-next': [
        pluginImport.createNodeResolver({
          extensions: ['.js', '.cjs', '.mjs'],
        }),
        {
          interfaceVersion: 3,
          resolve (modulePath) {
            const found = workspacePackageMap.has(modulePath)
            return { found, path: found ? path.resolve(__dirname, workspacePackageMap.get(modulePath)) : undefined }
          },
        },
      ],
    },
    plugins: {
      'import-x': pluginImport,
    },
    rules: {
      ...pluginImport.flatConfigs.recommended.rules,
      'import-x/no-named-as-default-member': 'off',
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
      'import-x/no-unresolved': 'off',
    },
  },
]
