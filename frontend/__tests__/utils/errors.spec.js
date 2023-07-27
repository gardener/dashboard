//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import * as errors from '@/utils/errors'

describe('utils', () => {
  describe('errors', () => {
    const message = 'message'
    const properties = { foo: 'bar' }

    let statusCode

    it('should create an 401 error', () => {
      const err = errors.createError((statusCode = 401), message, properties)
      expect(err).toMatchObject({
        name: 'UnauthorizedError',
        message,
        statusCode,
        ...properties,
      })
      expect(errors.isUnauthorizedError(err)).toBe(true)
    })

    it('should create an 403 error', () => {
      const err = errors.createError((statusCode = 403), message, properties)
      expect(err).toMatchObject({
        name: 'ForbiddenError',
        message,
        statusCode,
        ...properties,
      })
      expect(errors.isForbiddenError(err)).toBe(true)
    })

    it('should create an 404 error', () => {
      const err = errors.createError((statusCode = 404), message, properties)
      expect(err).toMatchObject({
        name: 'NotFoundError',
        message,
        statusCode,
        ...properties,
      })
      expect(errors.isNotFoundError(err)).toBe(true)
    })

    it('should create an 409 error', () => {
      const err = errors.createError((statusCode = 409), message, properties)
      expect(err).toMatchObject({
        name: 'ConflictError',
        message,
        statusCode,
        ...properties,
      })
      expect(errors.isConflictError(err)).toBe(true)
    })

    it('should create an 504 error', () => {
      const err = errors.createError((statusCode = 504), message, properties)
      expect(err).toMatchObject({
        name: 'GatewayTimeoutError',
        message,
        statusCode,
        ...properties,
      })
      expect(errors.isGatewayTimeoutError(err)).toBe(true)
    })

    it('should create an abort error', () => {
      const err = errors.createAbortError(message, properties)
      expect(err).toMatchObject({
        name: 'AbortError',
        message,
        ...properties,
      })
      expect(errors.isAbortError(err)).toBe(true)
    })

    it('should create a clock skew error', () => {
      const err = errors.createClockSkewError(message, properties)
      expect(err).toMatchObject({
        name: 'ClockSkewError',
        message,
        ...properties,
      })
      expect(errors.isClockSkewError(err)).toBe(true)
    })

    it('should create a no user error', () => {
      const err = errors.createNoUserError(message, properties)
      expect(err).toMatchObject({
        name: 'NoUserError',
        message,
        ...properties,
      })
      expect(errors.isNoUserError(err)).toBe(true)
    })

    it('should create a test error', () => {
      const err = errors.createError('test error', message, properties)
      expect(err).toMatchObject({
        name: 'TestError',
        message,
        ...properties,
      })
    })
  })
})
