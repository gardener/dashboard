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
const importNewlines = require('eslint-plugin-import-newlines')

const importNewlinesConfig = {
  plugins: {
    'import-newlines': {
      meta: {
        name: 'eslint-plugin-import-newlines',
        version: '1.4.0',
      },
      rules: importNewlines.rules,
    },
  },
  rules: {
    'import-newlines/enforce': ['error', 1],
  },
}

module.exports = [
  ...neostandard({}),
  {
    languageOptions: {
      ecmaVersion: 2025,
    },
  },
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'no-console': 'error',
    },
  },
  pluginSecurity.configs.recommended,
  {
    settings: {
      'import/resolver': {
        [require.resolve('../eslint-import-resolver-local.cjs')]: {
          map: [
            ['@gardener-dashboard/monitor', '../packages/monitor'],
            ['@gardener-dashboard/logger', '../packages/logger'],
            ['@gardener-dashboard/kube-client', '../packages/kube-client'],
            ['@gardener-dashboard/kube-config', '../packages/kube-config'],
            ['@gardener-dashboard/polling-watcher', '../packages/polling-watcher'],
            ['@gardener-dashboard/request', '../packages/request'],
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
      '**/jest.setup.cjs',
    ],
    plugins: {
      jest: pluginJest,
    },
    languageOptions: {
      globals: {
        ...pluginJest.environments.globals.globals,
        createAgent: true,
        fixtures: true,
      },
    },
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
  {
    ignores: ['dist'],
  },
  importNewlinesConfig,
]
