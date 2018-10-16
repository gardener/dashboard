global.chai = require('chai')

module.exports = {
  env: {
    mocha: true
  },
  plugins: [
    'chai-friendly'
  ],
  rules: {
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 2
  },
  globals: {
    sinon: true,
    chai: true
  }
}
