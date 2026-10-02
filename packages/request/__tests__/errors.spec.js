//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import http2 from 'http2'
import createError from 'http-errors'
import {
  TimeoutError,
  StreamError,
  ParseError,
  isAbortError,
  createHttpError,
  isHttpError,
  getHttp2ErrorName,
  createStreamTermination,
  isStreamNeverProcessed,
  mapStreamTerminationError,
} from '../lib/errors.js'

const {
  NGHTTP2_NO_ERROR,
  NGHTTP2_INTERNAL_ERROR,
  NGHTTP2_REFUSED_STREAM,
} = http2.constants

describe('errors', () => {
  it('#isAbortError', () => {
    expect(isAbortError()).toBe(false)
    expect(isAbortError({})).toBe(false)
    expect(isAbortError({ code: 'abort_err' })).toBe(false)
    expect(isAbortError({ code: 'ABORT_ERR' })).toBe(true)
  })

  describe('TimeoutError', () => {
    it('#constructor', () => {
      const message = 'timed out'
      const error = new TimeoutError(message)
      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe(message)
      expect(error.code).toBe('ETIMEDOUT')
    })
  })

  describe('ParseError', () => {
    it('#constructor', () => {
      const message = 'parsing failed'
      const foo = 'bar'
      const error = new ParseError(message, { foo })
      expect(error.name).toBe('ParseError')
      expect(error.message).toBe(message)
      expect(error.code).toBe('ERR_BODY_PARSE_FAILURE')
      expect(error.foo).toBe(foo)
    })
  })

  describe('StreamError', () => {
    it('#constructor', () => {
      const message = 'stream error'
      const error = new StreamError(message)
      expect(error.name).toBe('StreamError')
      expect(error.message).toBe(message)
      expect(error.code).toBe('ERR_HTTP2_STREAM_ERROR')
    })

    it('#constructor with properties and cause', () => {
      const cause = new Error('cause')
      const error = new StreamError('stream error', {
        code: 'ERR_STREAM_PREMATURE_CLOSE',
        cause,
        foo: 'bar',
      })
      expect(error).toMatchObject({
        name: 'StreamError',
        code: 'ERR_STREAM_PREMATURE_CLOSE',
        foo: 'bar',
      })
      expect(error.cause).toBe(cause)
      expect(Object.keys(error)).not.toContain('cause')
    })
  })

  describe('#getHttp2ErrorName', () => {
    it('should map every HTTP/2 error code to its name', () => {
      const names = [
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
      for (const name of names) {
        expect(getHttp2ErrorName(http2.constants[name])).toBe(name)
      }
    })

    it('should return null for unknown error codes', () => {
      expect(getHttp2ErrorName(14)).toBeNull()
      expect(getHttp2ErrorName(-1)).toBeNull()
      expect(getHttp2ErrorName(1.5)).toBeNull()
      expect(getHttp2ErrorName(null)).toBeNull()
    })
  })

  describe('#createStreamTermination', () => {
    const goaway = lastStreamID => ({
      errorCode: NGHTTP2_NO_ERROR,
      lastStreamID,
      receivedAt: 0,
    })

    it('should normalize missing values', () => {
      expect(createStreamTermination({})).toEqual({
        streamId: null,
        rstCode: null,
        rstCodeName: null,
        goaway: null,
        neverProcessed: true,
        responseReceived: false,
      })
    })

    it.each([
      ['a refused stream', { streamId: 3, rstCode: NGHTTP2_REFUSED_STREAM }, true],
      ['a stream above the GOAWAY lastStreamID', { streamId: 3, rstCode: NGHTTP2_INTERNAL_ERROR, goaway: goaway(1) }, true],
      ['a stream at the GOAWAY lastStreamID', { streamId: 3, rstCode: NGHTTP2_INTERNAL_ERROR, goaway: goaway(3) }, false],
      ['a reset stream', { streamId: 3, rstCode: NGHTTP2_INTERNAL_ERROR }, false],
      ['a refused stream after response headers', { streamId: 3, rstCode: NGHTTP2_REFUSED_STREAM, goaway: goaway(1), responseReceived: true }, false],
    ])('should classify %s', (_, options, neverProcessed) => {
      expect(createStreamTermination(options).neverProcessed).toBe(neverProcessed)
    })
  })

  describe('#isStreamNeverProcessed', () => {
    it('should check the termination of an error', () => {
      expect(isStreamNeverProcessed()).toBe(false)
      expect(isStreamNeverProcessed(new Error('error'))).toBe(false)
      expect(isStreamNeverProcessed({ termination: { neverProcessed: false } })).toBe(false)
      expect(isStreamNeverProcessed({ termination: { neverProcessed: true } })).toBe(true)
    })
  })

  describe('#mapStreamTerminationError', () => {
    const termination = createStreamTermination({
      streamId: 3,
      rstCode: NGHTTP2_INTERNAL_ERROR,
      responseReceived: true,
    })

    it.each([
      ['a premature close', { code: 'ERR_STREAM_PREMATURE_CLOSE' }],
      ['an HTTP/2 stream error', { code: 'ERR_HTTP2_STREAM_ERROR' }],
      ['a socket error', { code: 'ECONNRESET', syscall: 'read' }],
    ])('should wrap %s with the termination', (_, properties) => {
      const cause = Object.assign(new Error('transport failed'), properties)
      const error = mapStreamTerminationError(cause, termination)
      expect(error).toBeInstanceOf(StreamError)
      expect(error).toMatchObject({
        code: cause.code,
        termination,
        message: cause.message,
      })
      expect(error.cause).toBe(cause)
      expect(error.stack).toContain(`\nCaused by: ${cause.stack}`)
    })

    it('should wrap a session timeout with the termination', () => {
      const cause = new TimeoutError('PING not answered within 15000 ms')
      const error = mapStreamTerminationError(cause, termination)
      expect(error).toBeInstanceOf(StreamError)
      expect(error).toMatchObject({ code: 'ETIMEDOUT', termination })
    })

    it.each([
      ['a parse error', new ParseError('Unexpected end of JSON input')],
      ['a decompression error', Object.assign(new Error('unexpected end of file'), { code: 'Z_BUF_ERROR', errno: -5 })],
      ['an error without code', new Error('error')],
    ])('should return %s unchanged', (_, error) => {
      expect(mapStreamTerminationError(error, termination)).toBe(error)
    })

    it('should return the error unchanged without a new termination', () => {
      const error = Object.assign(new Error('Premature close'), { code: 'ERR_STREAM_PREMATURE_CLOSE' })
      expect(mapStreamTerminationError(error, undefined)).toBe(error)
      const classified = new StreamError('classified', { termination })
      expect(mapStreamTerminationError(classified, termination)).toBe(classified)
    })
  })

  describe('#isHttpError', () => {
    it('should check if an error is a HTTP error', () => {
      expect(isHttpError(new Error('message'))).toBe(false)
      expect(isHttpError(createError(404))).toBe(true)
      expect(isHttpError(createError(404), 404)).toBe(true)
      expect(isHttpError(createError(404), 410)).toBe(false)
      expect(isHttpError(createError(404), [410, 404])).toBe(true)
      expect(isHttpError(createError(404), [401, 403])).toBe(false)
    })
  })

  describe('#createHttpError', () => {
    it('should create different HTTP errors', () => {
      const error = createHttpError({ statusCode: 404 })
      expect(error).toMatchObject({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Response code 404 (Not Found)',
      })
    })
  })
})
