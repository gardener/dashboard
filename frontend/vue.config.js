const path = require('path')
const fs = require('fs')

const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin')
const MomentLocalesPlugin = require('moment-locales-webpack-plugin')

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').toString('utf8').trim()
const proxyTarget = 'http://localhost:3030'
const currentYear = new Date().getFullYear()

process.env.VUE_APP_VERSION = version

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
      .maxEntrypointSize(1048576)
      .maxAssetSize(1048576)
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
