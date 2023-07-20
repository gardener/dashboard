//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: '2022',
  },
  globals: {
    vi: 'readonly',
  },
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:vue/vue3-recommended',
    'plugin:vitest/recommended',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'no-console': 'error',
    quotes: ['error', 'single'],
    'space-before-function-paren': ['error', 'always'],
    'vue/no-mutating-props': ['error', {
      shallowOnly: true,
    }],
    'vue/require-default-prop': 'off',
    'vue/order-in-components': 'error',
  },
}
