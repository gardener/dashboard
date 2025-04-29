//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import neostandard from 'neostandard';
import pluginJest from 'eslint-plugin-jest';
import pluginSecurity from 'eslint-plugin-security';
import pluginLodash from 'eslint-plugin-lodash';
import pluginImport from 'eslint-plugin-import';
import path from 'path';

export default [
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
        fixtures: true,
        createAgent: 'readonly',
      },
    },
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-unsafe-regex': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-require': 'off',
    },
  },
  {
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@gardener-dashboard/kube-client', path.resolve(__dirname, './kube-client')],
            ['@gardener-dashboard/kube-config', path.resolve(__dirname, './kube-config')],
            ['@gardener-dashboard/logger', path.resolve(__dirname, './logger')],
            ['@gardener-dashboard/monitor', path.resolve(__dirname, './monitor')],
            ['@gardener-dashboard/polling-watcher', path.resolve(__dirname, './polling-watcher')],
            ['@gardener-dashboard/request', path.resolve(__dirname, './request')],
            ['@gardener-dashboard/test-utils', path.resolve(__dirname, './test-utils')],
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
];
