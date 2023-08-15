//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const { environments } = require('eslint-plugin-vitest')

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: { ecmaVersion: '2022' },
  globals: { ...environments.env.globals },
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:vue/vue3-recommended',
    'plugin:vitest/recommended',
  ],
  plugins: [
    'import-newlines',
  ],
  ignorePatterns: [
    '/dist/',
    '/build/',
    '/tmp/',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'no-console': 'error',
    quotes: ['error', 'single'],
    'space-before-function-paren': ['error', 'always'],
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      pathGroups: [
        {
          pattern: '@/**',
          group: 'internal',
        },
      ],
      'newlines-between': 'always',
    }],
    'object-curly-newline': ['error', {
      ImportDeclaration: { multiline: true, minProperties: 2 },
    }],
    'import-newlines/enforce': ['error', 1],
    'vue/no-mutating-props': ['error', { shallowOnly: true }],
    'vue/require-default-prop': 'off',
    'vue/order-in-components': 'error',
  },
}
