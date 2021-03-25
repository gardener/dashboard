//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const { createHttpError, isHttpError, TimeoutError, isAbortError } = require('../lib/errors')

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
        message: 'Response code 404 (Not Found)'
      })
    })
  })
})
