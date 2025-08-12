//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const path = require('path')

const neostandard = require('neostandard')
const pluginVue = require('eslint-plugin-vue')
const pluginSecurity = require('eslint-plugin-security')
const pluginLodash = require('eslint-plugin-lodash')
const pluginImport = require('eslint-plugin-import')
const pluginVitest = require('@vitest/eslint-plugin')
const importNewlines = require('eslint-plugin-import-newlines')

const securityConfig = pluginSecurity.configs.recommended

const lodashConfig = {
  plugins: {
    lodash: {
      meta: {
        name: 'eslint-plugin-lodash',
        version: '11.0.0',
      },
      rules: pluginLodash.rules,
    },
  },
  rules: {
    'lodash/path-style': ['error', 'array'],
    'lodash/import-scope': ['error', 'method'],
  },
}

const importConfig = {
  ignores: [
    'vite.config.js',
  ],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
        ],
        extensions: ['.js', '.vue'],
      },
      [path.resolve('../eslint-import-resolver-local.cjs')]: {
        map: [
          ['unfonts.css', null],
          ['@vueuse/integrations/useCookies', null],
          ['vuetify/components', null],
          ['vuetify/directives', null],
          ['vuetify/styles', null],
          ['vuetify/lib/util/colors', null],
          ['@/assets/whitespace-eye.svg?raw', null],
          ['@/assets/whitespace-eye-off.svg?raw', null],
          ['virtual:g-mdi-meta', null],
        ],
      },
    },
  },
  plugins: {
    import: pluginImport,
  },
  rules: {
    ...pluginImport.flatConfigs.recommended.rules,
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'unknown',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      pathGroups: [
        {
          pattern: '@/store/**',
          group: 'external',
          position: 'after',
        },
        {
          pattern: '@/layouts/**',
          group: 'unknown',
          position: 'before',
        },
        {
          pattern: '@/views/**',
          group: 'unknown',
        },
        {
          pattern: '@/components/**',
          group: 'unknown',
          position: 'after',
        },
        {
          pattern: '@/composables/**',
          group: 'internal',
          position: 'before',
        },
        {
          pattern: 'lodash/**',
          group: 'index',
          position: 'after',
        },
        {
          pattern: '@/lib/**',
          group: 'internal',
          position: 'after',
        },
        {
          pattern: '@/**',
          group: 'internal',
        },
      ],
      pathGroupsExcludedImportTypes: ['builtin'],
      'newlines-between': 'always',
    }],
  },
}

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

const vitestConfig = {
  files: ['__tests__/**'],
  plugins: {
    vitest: pluginVitest,
  },
  rules: {
    ...pluginVitest.configs.recommended.rules,
    'vitest/max-nested-describe': ['error', {
      max: 5,
    }],
  },
  languageOptions: {
    globals: {
      ...pluginVitest.environments.env.globals,
    },
  },
}

module.exports = [
  {
    ignores: [
      'dist/**',
      'build/**',
      'vite.config.js.timestamp-*',
    ],
  },
  ...neostandard({
    globals: {
      window: 'readonly',
      document: 'readonly',
      getComputedStyle: 'readonly',
      HTMLElement: 'readonly',
      Element: 'readonly',
      MouseEvent: 'readonly',
      FileReader: 'readonly',
      Range: 'readonly',
      fixtures: 'readonly',
      requestAnimationFrame: 'readonly',
    },
  }),
  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
    },
    rules: {
      'no-restricted-globals': ['error', 'find', 'event', 'location', 'history'],
      'no-console': 'error',
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/object-curly-newline': ['error', {
        ImportDeclaration: {
          multiline: true,
          minProperties: 2,
        },
      }],
    },
  },
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/no-mutating-props': ['error', {
        shallowOnly: true,
      }],
      'vue/require-default-prop': 'off',
      'vue/order-in-components': 'error',
    },
  },
  importConfig,
  importNewlinesConfig,
  vitestConfig,
  lodashConfig,
  securityConfig,
  {
    files: [
      '**/__fixtures__/**',
      '**/__mocks__/**',
      '**/__tests__/**',
      'vite.config.js',
    ],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
]
