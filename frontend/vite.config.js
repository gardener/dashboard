//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import {
  fileURLToPath,
  URL,
} from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Unfonts from 'unplugin-fonts/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

const proxyTarget = 'http://localhost:3030'

const KiB = 1024

const require = createRequire(import.meta.url)

function resolve (input) {
  return fileURLToPath(new URL(input, import.meta.url))
}

function htmlPlugin (env) {
  return {
    name: 'html-transform',
    transformIndexHtml: html => html.replace(/%(.*?)%/g, (match, key) => env[key]),
  }
}

export default defineConfig(({ command, mode }) => {
  const MODE = mode
  let VITE_APP_VERSION = process.env.VITE_APP_VERSION
  if (!VITE_APP_VERSION) {
    try {
      VITE_APP_VERSION = readFileSync(resolve('../VERSION'))
    } catch (err) {
      VITE_APP_VERSION = require('./package.json').version
    }
  }
  const VITE_BASE_URL = '/'
  const VITE_APP_TITLE = 'Gardener Dashboard'

  Object.assign(process.env, {
    MODE,
    VITE_APP_TITLE,
    VITE_APP_VERSION,
    VITE_BASE_URL,
  })

  const config = {
    plugins: [
      htmlPlugin(process.env),
      vue({
        template: {
          transformAssetUrls,
        },
      }),
      vuetify({
        autoImport: true,
        styles: {
          configFile: 'src/sass/settings.scss',
        },
      }),
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
    base: VITE_BASE_URL,
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      'process.env': {
        MODE,
        VITE_APP_TITLE,
        VITE_APP_VERSION,
        VITE_BASE_URL,
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
    server: {
      port: 8080,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/auth': {
          target: proxyTarget,
        },
      },
    },
  }

  if (command === 'build') {
    config.plugins.push(
      compression({
        algorithm: 'gzip',
        threshold: 8 * KiB,
      }),
      compression({
        algorithm: 'brotliCompress',
        threshold: 8 * KiB,
        compressionOptions: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        },
      }),
      visualizer({
        filename: 'build/stats.treemap.html',
        brotliSize: true,
        gzipSize: true,
        template: 'treemap',
      }),
      visualizer({
        filename: 'build/stats.sunburst.html',
        brotliSize: true,
        gzipSize: true,
        template: 'sunburst',
      }),
      visualizer({
        filename: 'build/stats.network.html',
        brotliSize: true,
        gzipSize: true,
        template: 'network',
      }),
    )
  }

  if (process.env.NODE_ENV === 'test') {
    const coverage = {
      provider: 'v8',
      exclude: ['**/__fixtures__/**'],
      all: false,
      thresholds: {
        statements: 75,
        branches: 80,
        functions: 47,
        lines: 75,
      },
    }

    config.test = {
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
      coverage,
    }
  }

  return config
})
