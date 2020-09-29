//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { createHttpError } = require('@gardener-dashboard/request')

const {
  StatusError,
  CacheExpiredError,
  isExpiredError,
  isResourceExpired,
  isGone,
  isTooLargeResourceVersionError,
  isGatewayTimeout
} = require('../lib/ApiErrors')

describe('kube-client', function () {
  describe('ApiErrors', function () {
    const code = 'code'
    const message = 'message'
    const reason = 'reason'

    it('should create a StatusError instance', function () {
      const statusError = new StatusError({ code, message, reason })
      expect(statusError).toBeInstanceOf(Error)
      expect(statusError).toHaveProperty('stack')
      expect(statusError.code).toBe(code)
      expect(statusError.message).toBe(message)
      expect(statusError.reason).toBe(reason)
    })

    it('should create a CacheExpiredError instance', function () {
      const error = new CacheExpiredError('Cache expired')
      expect(error).toBeInstanceOf(Error)
      expect(error).toHaveProperty('stack')
      expect(error.code).toBe(410)
      expect(error.message).toBe('Cache expired')
      expect(error.reason).toBe('Expired')
    })

    it('should check if a status error has code "Gone"', function () {
      const code = 410
      let error = new StatusError({ code })
      expect(isGone(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
      error = createHttpError({ statusCode: code })
      expect(isGone(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
    })

    it('should check if a status error has reason "Expired"', function () {
      const reason = 'Expired'
      let error = new StatusError({ reason })
      expect(isResourceExpired(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
      error = createHttpError({
        body: {
          reason
        }
      })
      expect(isResourceExpired(error)).toBe(true)
      expect(isExpiredError(error)).toBe(true)
    })

    it('should only consider StatusError or HttpError instances', function () {
      const error = new Error()
      error.reason = 'Expired'
      expect(isExpiredError(error)).toBe(false)
    })

    it('should handle "Resource version too large" errors correctly', function () {
      const code = 504
      const reason = 'Timeout'
      let error = createHttpError({
        statusCode: code,
        body: {
          reason
        }
      })
      expect(isGatewayTimeout(error)).toBe(true)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          code,
          reason
        }
      })
      expect(isGatewayTimeout(error)).toBe(true)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          code,
          reason: 'Gateway Timeout',
          details: {
            causes: [{ message: 'Too large resource version' }]
          }
        }
      })
      expect(isGatewayTimeout(error)).toBe(false)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
      error = createHttpError({
        body: {
          details: {
            causes: [{ reason: 'ResourceVersionTooLarge' }]
          }
        }
      })
      expect(isGatewayTimeout(error)).toBe(false)
      expect(isTooLargeResourceVersionError(error)).toBe(true)
    })
  })
})
