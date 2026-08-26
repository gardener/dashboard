//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginVitest = require('@vitest/eslint-plugin')
const pluginSecurity = require('eslint-plugin-security')
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
    rules: {
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      // Command output is part of the local-dashboard CLI contract.
      'no-console': 'off',
      'no-nested-ternary': 'error',
      curly: ['error', 'all'],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['warn', 5],
    },
  },
  pluginSecurity.configs.recommended,
  {
    files: ['hack/local-dashboard/**'],
    rules: {
      // Dynamic, validated paths and keyed configuration are fundamental to this CLI.
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    plugins: {
      import: pluginImport,
    },
    rules: pluginImport.flatConfigs.recommended.rules,
  },
  {
    files: ['hack/local-dashboard/vitest.config.mjs'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['hack/local-dashboard/test/**'],
    plugins: {
      vitest: pluginVitest,
    },
    rules: {
      ...pluginVitest.configs.recommended.rules,
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
      'vitest/no-disabled-tests': 'warn',
    },
  },
  importNewlinesConfig,
]
