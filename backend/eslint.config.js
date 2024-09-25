//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const neostandard = require('neostandard')
const jest = require('eslint-plugin-jest')
const security = require('eslint-plugin-security')
const lodash = require('eslint-plugin-lodash')

const jestConfig = jest.configs['flat/recommended']
const securityConfig = security.configs.recommended
const lodashConfig = {
  plugins: {
    lodash,
  },
  rules: {
    'lodash/path-style': ['error', 'array'],
  },
}

module.exports = [
  ...neostandard({
    ignores: neostandard.resolveIgnoresFromGitignore(),
    globals: {
      ...jestConfig.languageOptions.globals,
      createAgent: true,
      fixtures: true,
    },
  }),
  lodashConfig,
  securityConfig,
  {
    files: [
      '**/__tests__/**',
      '**/test/**/*.spec.js',
    ],
    ...jestConfig,
  },
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'no-console': 'error',
      'no-debugger': 'error',
    },
  },
  {
    files: [
      '**/__fixtures__/**',
      '**/__mocks__/**',
      '**/__tests__/**',
      '**/test/**',
      '**/jest.setup.js',
    ],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
]
