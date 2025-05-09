//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { clone, split, first, get, set } from 'lodash-es'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { globalLogger as logger } from '@gardener-dashboard/logger'
const xRequestStart = Symbol('x-request-start')

const xRequestId = {
  id: 0,
  next () {
    if (this.id < Number.MAX_SAFE_INTEGER) {
      this.id += 1
    } else {
      this.id = 1
    }
    return this.id
  },
}

function decodeBase64 (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function afterResponse (response) {
  const { headers, httpVersion, statusCode, statusMessage, body, request } = response
  const requestOptions = get(request, ['options'], {})
  const id = get(requestOptions, ['headers', 'x-request-id'])
  const { url, method, [xRequestStart]: start } = requestOptions
  const duration = start ? Date.now() - start : undefined
  logger.response({
    id,
    url,
    method,
    statusCode,
    statusMessage,
    httpVersion,
    headers: clone(headers),
    duration,
    body,
  })
  return response
}

function getUser ({ headers, key, cert }) {
  const user = {
    id: undefined,
    type: undefined,
  }

  const [schema, value] = split(headers.authorization, ' ') || []
  switch (schema) {
    case 'Bearer': {
      const payload = jwt.decode(value)
      if (payload) {
        if (payload.email) {
          user.type = 'email'
          user.id = payload.email
        } else {
          user.type = 'sub'
          user.id = payload.sub
        }
      } else {
        user.type = 'bearer'
        user.id = '"redacted"'
      }
      break
    }
    case 'Basic': {
      user.type = 'user'
      user.id = first(split(decodeBase64(value), ':'))
      break
    }
  }

  if (key && cert) {
    try {
      const rCRLF = /\r?\n/
      const x509 = new crypto.X509Certificate(cert)
      for (const field of split(x509.subject, rCRLF)) {
        const [, commonName] = /^(?:CN|commonName)=(.*)$/.exec(field) || []
        if (commonName) {
          user.type = 'cn'
          user.id = commonName
          break
        }
      }
    } catch (err) { /* ignore error */ }
  }
  return user.id ? user : undefined
}

function beforeRequest (options) {
  const { url, method, headers, body } = options
  options[xRequestStart] = Date.now() // eslint-disable-line security/detect-object-injection
  if (!('x-request-id' in headers)) {
    headers['x-request-id'] = xRequestId.next()
  }
  logger.request({
    url,
    method,
    user: getUser(options),
    headers: clone(headers),
    body,
  })
}

function addHook (options, hook) {
  const name = hook.name
  let hooks = get(options, ['hooks', name])
  if (!Array.isArray(hooks)) {
    set(options, ['hooks', name], (hooks = []))
  }
  hooks.push(hook)
  return options
}

function attach (options = {}) {
  const LEVELS = logger.LEVELS
  if (!logger.isDisabled(LEVELS.debug)) {
    addHook(options, beforeRequest)
    addHook(options, afterResponse)
  }
  return options
}

export default {
  attach,
  beforeRequest,
  afterResponse,
}
