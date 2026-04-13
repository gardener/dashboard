//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const crypto = require('node:crypto')

function decodeBase64 (data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

function encodeBase64 (data) {
  return Buffer.from(data, 'utf8').toString('base64')
}

function getCertificate (payload = '...') {
  return [
    '-----BEGIN CERTIFICATE-----',
    encodeBase64(payload),
    '-----END CERTIFICATE-----',
  ].join('\n')
}

function getPrivateKey (payload = '...') {
  return [
    '-----BEGIN RSA PRIVATE KEY-----',
    encodeBase64(payload),
    '-----END RSA PRIVATE KEY-----',
  ].join('\n')
}

function randomNumber () {
  return crypto.randomBytes(4).readUInt32LE(0)
}

module.exports = {
  encodeBase64,
  decodeBase64,
  getCertificate,
  getPrivateKey,
  randomNumber,
}
