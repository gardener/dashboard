const path = require('path')
const fs = require('fs')

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').toString('utf8').trim()

process.env.VUE_APP_VERSION = version

module.exports = {
  configureWebpack: config => {
    config.externals = /^ws$/i
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
      '/metrics': {
        target: 'http://localhost:3030'
      },
      '/config.json': {
        target: 'http://localhost:3030'
      },
      '/keys': {
        target: 'http://localhost:3030'
      }
    }
  }
}
