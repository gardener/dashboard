//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import http from 'http'
import createError from 'http-errors'
import { get } from 'lodash-es'

class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.code = 'ETIMEDOUT'
    Error.captureStackTrace(this, this.constructor)
  }
}

class StreamError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.code = 'ERR_HTTP2_STREAM_ERROR'
    Error.captureStackTrace(this, this.constructor)
  }
}

class ParseError extends Error {
  constructor (message, properties) {
    super(message)
    Object.assign(this, {
      name: this.constructor.name,
      code: 'ERR_BODY_PARSE_FAILURE',
      ...properties,
    })
    Error.captureStackTrace(this, this.constructor)
  }
}

function isAbortError (err = {}) {
  return err.code === 'ABORT_ERR'
}

function getDefaultStatusMessage (statusCode) {
  return get(http.STATUS_CODES, [statusCode])
}

function createHttpError (options) {
  const {
    statusCode = 500,
    statusMessage = getDefaultStatusMessage(statusCode),
    response,
    headers,
    body,
  } = options
  const properties = { statusMessage }
  if (headers) {
    properties.headers = { ...headers }
  }
  if (body) {
    properties.body = body
  }
  if (response) {
    properties.response = response
  }
  const message = body && body.message
    ? body.message
    : `Response code ${statusCode} (${statusMessage})`
  return createError(statusCode, message, properties)
}

function isHttpError (err, expectedStatusCode) {
  if (!createError.isHttpError(err)) {
    return false
  }
  if (expectedStatusCode) {
    if (Array.isArray(expectedStatusCode)) {
      return expectedStatusCode.indexOf(err.statusCode) !== -1
    }
    return expectedStatusCode === err.statusCode
  }
  return true
}

export {
  TimeoutError,
  StreamError,
  ParseError,
  createHttpError,
  isHttpError,
  isAbortError,
}
