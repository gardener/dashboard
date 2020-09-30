const path = require('path')
const fs = require('fs')

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').toString('utf8').trim()

process.env.VUE_APP_VERSION = version

module.exports = {
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Kubernetes Gardener'
    }
  },
  configureWebpack (config) {
    config.externals = /^ws$/i
    config.performance = {
      maxAssetSize: 1572864,
      maxEntrypointSize: 1048576
    }
    for (const plugin of config.plugins) {
      if (plugin.constructor.name === 'MiniCssExtractPlugin') {
        plugin.options.ignoreOrder = true
        break
      }
    }
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        ws: true
      },
      '/auth': {
        target: 'http://localhost:3030'
      },
      '/config.json': {
        target: 'http://localhost:3030'
      }
    }
  }
}
