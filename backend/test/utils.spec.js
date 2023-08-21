//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { AssertionError } = require('assert').strict
const { encodeBase64, decodeBase64, getConfigValue, shootHasIssue, getSeedNameFromShoot } = require('../lib/utils')

describe('utils', function () {
  describe('index', function () {
    it('should base64 encode some values', function () {
      expect(encodeBase64()).toBeUndefined()
      expect(encodeBase64('')).toBeUndefined()
      expect(encodeBase64('foo')).toBe('Zm9v')
    })

    it('should base64 decode some values', function () {
      expect(decodeBase64()).toBeUndefined()
      expect(decodeBase64('')).toBeUndefined()
      expect(decodeBase64('Zm9v')).toBe('foo')
    })

    it('should return some config values with defaults', function () {
      expect(() => getConfigValue('test')).toThrowError(AssertionError)
      expect(getConfigValue('logLevel')).toBe('info')
    })

    it('should return if a shoot has issues', function () {
      const shoot = {
        metadata: {
          labels: {
            'shoot.gardener.cloud/status': undefined
          }
        }
      }
      expect(shootHasIssue(shoot)).toBe(false)
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'healthy'
      expect(shootHasIssue(shoot)).toBe(false)
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'unhealthy'
      expect(shootHasIssue(shoot)).toBe(true)
    })

    it('should return the seed name for a shoot resource', function () {
      expect(() => getSeedNameFromShoot({})).toThrowError(AssertionError)
      const shoot = {
        spec: {
          seedName: 'foo'
        },
        status: {
          seed: 'bar'
        }
      }
      expect(getSeedNameFromShoot(shoot)).toBe('foo')
    })
  })
})
