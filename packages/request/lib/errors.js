//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import http from 'http'
import http2 from 'http2'
import createError from 'http-errors'
import { get } from 'lodash-es'

const {
  NGHTTP2_REFUSED_STREAM,
} = http2.constants

const http2ErrorNames = [
  'NGHTTP2_NO_ERROR',
  'NGHTTP2_PROTOCOL_ERROR',
  'NGHTTP2_INTERNAL_ERROR',
  'NGHTTP2_FLOW_CONTROL_ERROR',
  'NGHTTP2_SETTINGS_TIMEOUT',
  'NGHTTP2_STREAM_CLOSED',
  'NGHTTP2_FRAME_SIZE_ERROR',
  'NGHTTP2_REFUSED_STREAM',
  'NGHTTP2_CANCEL',
  'NGHTTP2_COMPRESSION_ERROR',
  'NGHTTP2_CONNECT_ERROR',
  'NGHTTP2_ENHANCE_YOUR_CALM',
  'NGHTTP2_INADEQUATE_SECURITY',
  'NGHTTP2_HTTP_1_1_REQUIRED',
]

function getHttp2ErrorName (errorCode) {
  if (!Number.isInteger(errorCode) || errorCode < 0) {
    return null
  }
  return http2ErrorNames.at(errorCode) ?? null
}

function createStreamTermination ({
  streamId,
  rstCode,
  goaway,
  responseReceived = false,
}) {
  streamId ??= null
  rstCode ??= null
  goaway ??= null
  return {
    streamId,
    rstCode,
    rstCodeName: getHttp2ErrorName(rstCode),
    goaway,
    // a received response proves the server acted on the request, even if nghttp2
    // refuses the stream afterwards because of a GOAWAY with a lower lastStreamID
    neverProcessed: !responseReceived && (
      streamId === null ||
      rstCode === NGHTTP2_REFUSED_STREAM ||
      (goaway !== null && goaway.lastStreamID < streamId)
    ),
    responseReceived,
  }
}

function isStreamNeverProcessed (err) {
  return err?.termination?.neverProcessed === true
}

function isTransportError (err) {
  return err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    (typeof err.code === 'string' && err.code.startsWith('ERR_HTTP2_')) ||
    typeof err.syscall === 'string' ||
    err instanceof TimeoutError
}

function mapStreamTerminationError (err, termination) {
  if (!termination || !(err instanceof Error) || err.termination || !isTransportError(err)) {
    return err
  }
  // wrap rather than annotate: Node passes one error object to all streams of a destroyed session
  const error = new StreamError(err.message, {
    code: err.code,
    cause: err,
    termination,
  })
  error.stack += `\nCaused by: ${err.stack}`
  return error
}

class TimeoutError extends Error {
  constructor (message, options) {
    super(message, options)
    this.name = this.constructor.name
    this.code = 'ETIMEDOUT'
    Error.captureStackTrace(this, this.constructor)
  }
}

class StreamError extends Error {
  constructor (message, { cause, ...properties } = {}) {
    super(message, cause !== undefined ? { cause } : undefined)
    Object.assign(this, {
      name: this.constructor.name,
      code: 'ERR_HTTP2_STREAM_ERROR',
      ...properties,
    })
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
  getHttp2ErrorName,
  createStreamTermination,
  isStreamNeverProcessed,
  mapStreamTerminationError,
}
