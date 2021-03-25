//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { clone, split, first, get, set } = require('lodash')
const { v1: uuidv1 } = require('uuid')
const { pki } = require('node-forge')
const jwt = require('jsonwebtoken')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const xRequestStart = Symbol('x-request-start')

function decodeBase64 (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function afterResponse (response) {
  const { headers, httpVersion, statusCode, statusMessage, body, request } = response
  const requestOptions = get(request, 'options', {})
  const id = get(requestOptions, 'headers["x-request-id"]')
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
    body
  })
  return response
}

function getUser ({ headers, key, cert }) {
  const user = {
    id: undefined,
    type: undefined
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
      const { subject } = pki.certificateFromPem(cert)
      user.type = 'cn'
      user.id = subject.getField('CN').value
    } catch (err) { /* ignore error */ }
  }
  return user.id ? user : undefined
}

function beforeRequest (options) {
  const { url, method, headers, body } = options
  options[xRequestStart] = Date.now()
  if (!('x-request-id' in headers)) {
    headers['x-request-id'] = uuidv1()
  }
  logger.request({
    url,
    method,
    user: getUser(options),
    headers: clone(headers),
    body
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

module.exports = {
  attach,
  beforeRequest,
  afterResponse
}
