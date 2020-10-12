const path = require('path')
const fs = require('fs')

const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin')
const MomentLocalesPlugin = require('moment-locales-webpack-plugin')

if (!Reflect.has(process.env, 'VUE_APP_VERSION')) {
  try {
    process.env.VUE_APP_VERSION = fs.readFileSync(path.resolve(__dirname, '../VERSION')).toString().trim()
  } catch (err) {
    process.env.VUE_APP_VERSION = require('./package.json').version
  }
}
const proxyTarget = 'http://localhost:3030'
const currentYear = new Date().getFullYear()

const KiB = 1024
const MiB = 1024 * KiB

module.exports = {
  transpileDependencies: [
    'vuetify'
  ],
  pages: {
    index: {
      entry: 'src/main.js',
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
    if (process.env.NODE_ENV === 'development') {
      config.plugins.delete('VuetifyLoaderPlugin')
    }

    config
      .plugin('moment-locales')
      .use(MomentLocalesPlugin, [{
        localesToKeep: ['es-us']
      }])

    config
      .plugin('moment-timezone')
      .use(MomentTimezoneDataPlugin, [{
        startYear: currentYear,
        endYear: currentYear
      }])

    config.externals({
      websocket: /^ws$/i
    })

    config.performance
      .maxAssetSize(1 * MiB)
      .maxEntrypointSize(2 * MiB)
  },
  devServer: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true
      },
      '/auth': {
        target: proxyTarget
      },
      '/config.json': {
        target: proxyTarget
      }
    }
  }
}
