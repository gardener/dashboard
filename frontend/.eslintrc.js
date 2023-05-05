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
    'plugin:vue/vue3-essential',
    'plugin:vitest/recommended',
    'plugin:vuetify/base',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    quotes: ['error', 'single'],
    'space-before-function-paren': ['error', 'always'],
  },
}
