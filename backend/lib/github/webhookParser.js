//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createHmac, timingSafeEqual } = require('crypto')
const bodyParser = require('body-parser')
const createError = require('http-errors')
const config = require('../config')

function digestsEqual (a, b) {
  const aBuff = Buffer.from(a)
  const bBuff = Buffer.from(b)
  if (aBuff.length !== bBuff.length) return false
  return timingSafeEqual(aBuff, bBuff)
}

function createHubSignature (secret, value) {
  const algorithm = 'sha256'
  return `${algorithm}=${createHmac(algorithm, secret).update(value).digest('hex')}`
}

function verify (req, res, body) {
  const webhookSecret = config.gitHub?.webhookSecret
  if (!webhookSecret) {
    throw createError(500, 'Property \'gitHub.webhookSecret\' not configured on dashboard backend')
  }
  const requestSignature = req.headers['x-hub-signature-256']
  if (!requestSignature) {
    throw createError(403, 'Header \'x-hub-signature-256\' not provided')
  }

  const signature = createHubSignature(webhookSecret, body)
  if (!digestsEqual(requestSignature, signature)) {
    throw createError(403, 'Signatures didn\'t match!')
  }
}

module.exports = {
  verify,
  createHubSignature,
  parser: bodyParser.json({ verify })
}
