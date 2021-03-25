//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const createError = require('http-errors')

class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.code = 'ETIMEDOUT'
    Error.captureStackTrace(this, this.constructor)
  }
}

function isAbortError (err = {}) {
  return err.code === 'ABORT_ERR'
}

function createHttpError ({ statusCode, statusMessage = http.STATUS_CODES[statusCode], response, headers, body }) {
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

module.exports = {
  TimeoutError,
  createHttpError,
  isHttpError,
  isAbortError
}
