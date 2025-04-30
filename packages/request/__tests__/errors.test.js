//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createError from 'http-errors'
import {
  TimeoutError,
  StreamError,
  ParseError,
  isAbortError,
  createHttpError,
  isHttpError,
} from '../lib/errors.js'

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
