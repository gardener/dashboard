//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const pluginVitest = require('@vitest/eslint-plugin')
const pluginSecurity = require('eslint-plugin-security')
const pluginLodash = require('eslint-plugin-lodash')

module.exports = [
  ...neostandard({}),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'no-console': 'error',
    },
  },
  pluginSecurity.configs.recommended,
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
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
      'vitest/no-conditional-expect': 'off',
      'vitest/no-disabled-tests': 'warn',
    },
  },
]
