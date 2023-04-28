// Plugins
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

// Utilities
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const proxyTarget = 'http://localhost:3030'

const KiB = 1024

const require = createRequire(import.meta.url)
const resolve = input => fileURLToPath(new URL(input, import.meta.url))
const htmlPlugin = env => ({
  name: 'html-transform',
  transformIndexHtml: html => html.replace(/%(.*?)%/g, (match, key) => env[key]),
})

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
  const VITE_BASE_URL = '/ui/'
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
    test: {
      include: ['**/__tests__/*'],
      globals: true,
      environment: 'jsdom',
      clearMocks: true,
      setupFiles: [
        'vitest.setup.js',
      ],
      coverage: {
        provider: 'c8',
        branches: 42,
        functions: 27,
        lines: 39,
        statements: 39,
      },
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

  return config
})
