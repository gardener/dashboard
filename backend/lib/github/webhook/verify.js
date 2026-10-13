//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createHmac,
  timingSafeEqual,
} from 'crypto'
import assert from 'assert'
import createError from 'http-errors'
import config from '../../config/index.js'

function digestsEqual (a, b) {
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

function hasValidSignature (req) {
  const webhookSecret = config.gitHub?.webhookSecret
  assert.ok(webhookSecret, 'Property \'gitHub.webhookSecret\' not configured on dashboard backend')

  const requestSignatureHeader = req.headers['x-hub-signature-256']
  if (!requestSignatureHeader?.startsWith('sha256=')) {
    return false
  }
  const requestSignatureHash = requestSignatureHeader.slice('sha256='.length)
  const requestSignature = Buffer.from(requestSignatureHash, 'hex')

  const signature = createHmac('sha256', webhookSecret).update(req.body).digest()
  return digestsEqual(requestSignature, signature)
}

function ensureJsonContentType (req, res, next) {
  if (!req.is('json')) {
    return next(createError(415, 'Content-Type must be application/json'))
  }
  next()
}

export {
  hasValidSignature,
  ensureJsonContentType,
}
