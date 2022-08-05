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

function onceEvent (emitter, name) {
  return new Promise(resolve => emitter.once(name, resolve))
}

function hash (data, { algorithm = 'md5', encoding = 'hex' } = {}) {
  return crypto
    .createHash(algorithm)
    .update(data)
    .digest(encoding)
}

function decodeBase64 (data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

function encodeBase64 (data) {
  return Buffer.from(data, 'utf8').toString('base64')
}

function randomNumber () {
  return crypto.randomBytes(4).readUInt32LE(0)
}

module.exports = {
  getOwnSymbol,
  getOwnSymbolProperty,
  nextTick,
  delay,
  onceEvent,
  hash,
  randomNumber,
  encodeBase64,
  decodeBase64
}
