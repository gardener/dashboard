// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

const path = require('path')
const fs = require('fs')
const zlib = require('zlib')

const CircularDependencyPlugin = require('circular-dependency-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')
const { ProvidePlugin, NormalModuleReplacementPlugin } = require('webpack')

if (!Reflect.has(process.env, 'VUE_APP_VERSION')) {
  try {
    process.env.VUE_APP_VERSION = fs.readFileSync(path.resolve(__dirname, '../VERSION')).toString().trim()
  } catch (err) {
    process.env.VUE_APP_VERSION = require('./package.json').version
  }
}
const proxyTarget = 'http://localhost:3030'

const KiB = 1024
const MiB = 1024 * KiB

module.exports = {
  transpileDependencies: true,
  pages: {
    index: {
      entry: process.env.NODE_ENV === 'development'
        ? 'src/main.dev.js'
        : 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Kubernetes Gardener'
    }
  },
  css: {
    extract: {
      ignoreOrder: true
    }
  },
  chainWebpack (config) {
    config.externals({
      websocket: /^ws$/i
    })

    config.performance
      .maxAssetSize(1 * MiB)
      .maxEntrypointSize(2 * MiB)

    config.resolve
      .set('fallback', {
        assert: false,
        readline: false,
        events: require.resolve('eventemitter3'),
        buffer: require.resolve('buffer/'),
        process: path.resolve(path.join(__dirname, 'src', 'process.js'))
      })

    config
      .plugin('provide')
      .use(ProvidePlugin, [
        {
          Buffer: ['buffer', 'Buffer'],
          process: ['process']
        }
      ])

    config
      .plugin('normal-module-replacement')
      .use(NormalModuleReplacementPlugin, [
        /^node:/,
        resource => {
          resource.request = resource.request.replace(/^node:/, '')
        }
      ])

    if (process.env.NODE_ENV === 'production') {
      config
        .plugin('vuetify-loader')
        .use(VuetifyLoaderPlugin)

      config
        .plugin('circular-dependency')
        .use(CircularDependencyPlugin, [
          {
            exclude: /\.yarn/,
            include: /src/,
            failOnError: true,
            allowAsyncCycles: false,
            cwd: process.cwd()
          }
        ])

      const compressionPluginOptions = {
        test: /\.(js|css|html|svg|eot|ttf)$/,
        threshold: 8192,
        minRatio: 0.8
      }
      config
        .plugin('gzip-compress')
        .use(CompressionPlugin, [{
          filename: '[path][base].gz',
          algorithm: 'gzip',
          ...compressionPluginOptions
        }])
      config
        .plugin('brotli-compress')
        .use(CompressionPlugin, [{
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          compressionOptions: {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11
            }
          },
          ...compressionPluginOptions
        }])
    }
  },
  devServer: {
    proxy: {
      '/api/stream': {
        target: proxyTarget,
        onProxyRes (proxyRes, req, res) {
          const cleanup = err => {
            // cleanup event listeners to allow clean garbage collection
            proxyRes.removeListener('error', cleanup)
            proxyRes.removeListener('close', cleanup)
            res.removeListener('error', cleanup)
            res.removeListener('close', cleanup)
            console.log('destroy response and proxy response') // eslint-disable-line
            // destroy all source streams to propagate the caught event backward
            res.destroy(err)
            proxyRes.destroy(err)
          }
          proxyRes.once('error', cleanup)
          proxyRes.once('close', cleanup)
          res.once('error', cleanup)
          res.once('close', cleanup)
        }
      },
      '/api': {
        target: proxyTarget
      },
      '/auth': {
        target: proxyTarget
      }
    }
  }
}
