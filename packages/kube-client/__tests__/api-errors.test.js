//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import request from '@gardener-dashboard/request'

import {
  StatusError,
  CacheExpiredError,
  isExpiredError,
  isResourceExpired,
  isGone,
  isTooLargeResourceVersionError,
  isGatewayTimeout,
} from '../lib/ApiErrors.js'
const { createHttpError } = request

describe('kube-client', () => {
  describe('ApiErrors', () => {
    const code = 'code'
    const message = 'message'
    const reason = 'reason'

    it('should create a StatusError instance', () => {
      const statusError = new StatusError({ code, message, reason })
      expect(statusError).toBeInstanceOf(Error)
      expect(statusError).toHaveProperty('stack')
      expect(statusError.code).toBe(code)
      expect(statusError.message).toBe(message)
      expect(statusError.reason).toBe(reason)
    })

    it('should create a CacheExpiredError instance', () => {
      const error = new CacheExpiredError('Cache expired')
      expect(error).toBeInstanceOf(Error)
      expect(error).toHaveProperty('stack')
      expect(error.code).toBe(410)
      expect(error.message).toBe('Cache expired')
      expect(error.reason).toBe('Expired')
    })

    it('should check if a status error has code "Gone"', () => {
      const code = 410
      let error = new StatusError({ code })
      expect(isGone(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
      error = createHttpError({ statusCode: code })
      expect(isGone(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
    })

    it('should check if a status error has reason "Expired"', () => {
      const reason = 'Expired'
      let error = new StatusError({ reason })
      expect(isResourceExpired(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
      error = createHttpError({
        body: {
          reason,
        },
      })
      expect(isResourceExpired(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
    })

    it('should only consider StatusError or HttpError instances', () => {
      const error = new Error()
      error.reason = 'Expired'
      expect(isExpiredError(error)).toBe(false)
    })

    it('should handle "Resource version too large" errors correctly', () => {
      const code = 504
      const reason = 'Timeout'
      let error = createHttpError({
        statusCode: code,
        body: {
          reason,
        },
      })
      expect(isGatewayTimeout(error)).toBe(true)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          code,
          reason,
        },
      })
      expect(isGatewayTimeout(error)).toBe(true)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          code,
          reason: 'Gateway Timeout',
          details: {
            causes: [{ message: 'Too large resource version' }],
          },
        },
      })
      expect(isGatewayTimeout(error)).toBe(false)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          details: {
            causes: [{ reason: 'ResourceVersionTooLarge' }],
          },
        },
      })
      expect(isGatewayTimeout(error)).toBe(false)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
    })
  })
})
