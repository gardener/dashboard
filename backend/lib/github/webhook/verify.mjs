//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createHmac, timingSafeEqual } = require('crypto')
const assert = require('assert')
const createError = require('http-errors')
const config = require('../../config')

function digestsEqual (a, b) {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function verify (req, res, body) {
  const webhookSecret = config.gitHub?.webhookSecret
  assert.ok(webhookSecret, 'Property \'gitHub.webhookSecret\' not configured on dashboard backend')

  const requestSignatureHeader = req.headers['x-hub-signature-256']
  if (!requestSignatureHeader?.startsWith('sha256=')) {
    throw createError(403, 'Header \'x-hub-signature-256\' not provided or invalid')
  }
  const requestSignatureHash = requestSignatureHeader.slice('sha256='.length)
  const requestSignature = Buffer.from(requestSignatureHash, 'hex')

  const signature = createHmac('sha256', webhookSecret).update(body).digest()
  if (!digestsEqual(requestSignature, signature)) {
    throw createError(403, 'Signatures didn\'t match!')
  }
}

module.exports = verify
