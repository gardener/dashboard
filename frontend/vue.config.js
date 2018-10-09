const path = require('path')
const fs = require('fs')
const _ = require('lodash')

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').toString('utf8').trim()

process.env.VUE_APP_VERSION = version

module.exports = {
  configureWebpack: config => {
    _.set(config, 'resolve.alias.vue$', 'vue/dist/vue.js')
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        ws: true
      },
      '/config.json': {
        target: 'http://localhost:3030'
      }
    }
  }
}
