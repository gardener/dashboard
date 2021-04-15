//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const crypto = require('crypto')

function getOwnSymbol (obj, description) {
  return Object.getOwnPropertySymbols(obj).find(symbol => symbol.description === description)
}

function getOwnSymbolProperty (obj, description) {
  return obj[getOwnSymbol(obj, description)]
}

function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

function delay (milliseconds = 0) {
  return new Promise(resolve => {
    if (milliseconds > 0) {
      setTimeout(resolve, milliseconds)
    } else {
      setImmediate(resolve)
    }
  })
}

function hash (data, { algorithm = 'md5', encoding = 'hex' } = {}) {
  return crypto
    .createHash(algorithm)
    .update(data)
    .digest(encoding)
}

module.exports = {
  getOwnSymbol,
  getOwnSymbolProperty,
  nextTick,
  delay,
  hash
}
