//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import {
  readFileSync,
  existsSync,
} from 'node:fs'
import {
  fileURLToPath,
  URL,
} from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Unfonts from 'unplugin-fonts/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import { mdiMeta } from './vite/g-mdi-meta.js'

const proxyTarget = 'http://localhost:3030'

const KiB = 1024

const YELLOW = '\u001b[33m'
const WHITE_BLACK = '\u001b[37;40m'
const RESET = '\u001b[0m'

const require = createRequire(import.meta.url)

function resolve (input) {
  return fileURLToPath(new URL(input, import.meta.url))
}

function htmlPlugin (env) {
  return {
    name: 'html-transform',
    transformIndexHtml: html => html.replace(/%(.*?)%/g, (_, key) => env[key]),
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

  const manualChunks = {
    vendor: [
      '@braintree/sanitize-url',
      'lodash',
      'js-yaml',
      'highlight.js',
      'socket.io-client',
      'dayjs',
      'semver',
      'js-base64',
      'downloadjs',
      'md5',
      'uuid',
      'netmask',
      'statuses',
      'jwt-decode',
      'toidentifier',
    ],
    vuetify: [
      'vuetify',
    ],
  }

  const config = {
    build: {
      rollupOptions: {
        output: {
          manualChunks (id) {
            const match = /\/node_modules\/([^@/]+|@[^/]+\/[^/]*)/.exec(id)
            for (const [key, value] of Object.entries(manualChunks)) {
              if (value.includes(match?.[1])) {
                return key
              }
            }
          },
        },
      },
    },
    plugins: [
      htmlPlugin(process.env),
      mdiMeta(),
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
      __TEST__: mode === 'test',
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
  }

  if (command === 'serve') {
    const keyPath = resolve('./ssl/key.pem')
    const certPath = resolve('./ssl/cert.pem')
    const https = existsSync(keyPath) && existsSync(certPath)
      ? {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      : true

    if (https === true && mode === 'development') {
      // eslint-disable-next-line no-console
      console.warn(YELLOW + 'WARNING:' + RESET + ' SSL key and certificate files are missing. We recommend running ' + WHITE_BLACK + 'yarn setup' + RESET + ' to generate certificate files and add the CA to the keychain.')
      config.plugins.push(basicSsl({
        name: 'vite-develpment-server',
        domains: ['localhost', '127.0.0.1'],
      }))
    }

    config.server = {
      port: 8443,
      strictPort: true,
      https,
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
    }

    if (mode === 'test') {
      const coverage = {
        provider: 'v8',
        exclude: ['**/__fixtures__/**'],
        all: false,
        thresholds: {
          statements: 74,
          branches: 80,
          functions: 47,
          lines: 74,
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
  }

  if (command === 'build') {
    config.plugins.push(
      compression({
        algorithm: 'brotliCompress',
        threshold: 8 * KiB,
        compressionOptions: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 8,
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

  return config
})
