//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import {
  fileURLToPath,
  URL,
} from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import Unfonts from 'unplugin-fonts/vite'

import { mdiMeta } from './vite/g-mdi-meta.js'

const require = createRequire(import.meta.url)

const resolve = input => fileURLToPath(new URL(input, import.meta.url))

let VITE_APP_VERSION = process.env.VITE_APP_VERSION
if (!VITE_APP_VERSION) {
  try {
    VITE_APP_VERSION = readFileSync(resolve('../VERSION'), 'utf8').trim()
  } catch {
    VITE_APP_VERSION = require('./package.json').version
  }
}

export default defineConfig({
  plugins: [
    mdiMeta(),
    vue(),
    Unfonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            subset: 'latin',
          },
          {
            name: 'Roboto',
            weights: [400],
            styles: ['italic'],
            subset: 'latin',
          },
        ],
      },
    }),
  ],
  define: {
    __TEST__: true,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    'process.env': {
      MODE: 'test',
      VITE_APP_TITLE: 'Gardener Dashboard',
      VITE_APP_VERSION,
      VITE_BASE_URL: '/',
    },
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  test: {
    include: ['__tests__/**/*.spec.js'],
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: [
      'vitest.setup.js',
    ],
    server: {
      deps: {
        inline: [
          'vuetify',
        ],
      },
    },
    coverage: {
      provider: 'v8',
      exclude: ['**/__fixtures__/**'],
      all: false,
      thresholds: {
        statements: 74,
        branches: 80,
        functions: 47,
        lines: 74,
      },
    },
  },
})
