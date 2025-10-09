//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import debug from '../lib/debug.js'
import jwt from 'jsonwebtoken'

const { attach, beforeRequest, afterResponse } = debug

describe('kube-client', () => {
  describe('debug', () => {
    const url = new URL('https://kubernetes/foo/bar')
    const method = 'GET'
    const body = { ok: true }
    const statusCode = 200
    const statusMessage = 'Ok'
    const httpVersion = 'HTTP/1.1'
    const user = {
      user: 'hugo',
      password: 'secret',
      sub: 'foobar',
      email: 'foo@bar.com',
      bearer: '"redacted"',
      cn: 'foobar',
      cert: `-----BEGIN CERTIFICATE-----
MIIB3DCCAYagAwIBAgIUR4tYMxv8KYxP86VjN/qBs63hin8wDQYJKoZIhvcNAQEL
BQAwMTEPMA0GA1UEAwwGZm9vYmFyMQswCQYDVQQGEwJERTERMA8GA1UECgwIR2Fy
ZGVuZXIwIBcNMjAwMTE2MTE1NTQwWhgPMjExOTEyMjMxMTU1NDBaMDExDzANBgNV
BAMMBmZvb2JhcjELMAkGA1UEBhMCREUxETAPBgNVBAoMCEdhcmRlbmVyMFwwDQYJ
KoZIhvcNAQEBBQADSwAwSAJBANgAziJQ7j4Wr3PXpMVv54hZuVM5GQayApJyTrDS
fe7OYjpuqDItPlw28DwtAULw/j/yChXLNr+sAudsC2qTQ2sCAwEAAaN0MHIwHQYD
VR0OBBYEFMXsVnwnBJ7K4NSnkRt0IpVthT4HMB8GA1UdIwQYMBaAFMXsVnwnBJ7K
4NSnkRt0IpVthT4HMA4GA1UdDwEB/wQEAwIFoDAgBgNVHSUBAf8EFjAUBggrBgEF
BQcDAQYIKwYBBQUHAwIwDQYJKoZIhvcNAQELBQADQQCAiPJMH1azxaCTYYdglrAT
xrfonUDHQfXphOlk7VDCmkmXK0rEQUcA4wOgJgq84Tr9rHAcYGMvOZ/B6Gs+DmyI
-----END CERTIFICATE-----`,
      authorization (key) {
        if (key === 'cn') {
          return undefined
        }
        if (key === 'user') {
          return 'Basic ' + Buffer.from([this.user, this.password].join(':')).toString('base64')
        }
        if (key === 'bearer') {
          return 'Bearer <token>'
        }
        return 'Bearer ' + jwt.sign({ [key]: this[key] }, 'secret')
      },
    }

    let isDisabledStub
    let requestStub
    let responseStub

    beforeEach(() => {
      isDisabledStub = jest.spyOn(logger, 'isDisabled').mockReturnValue(false)
      requestStub = jest.spyOn(logger, 'request').mockImplementation(() => {})
      responseStub = jest.spyOn(logger, 'response').mockImplementation(() => {})
    })

    it('should attach debug hooks', () => {
      const { hooks } = attach({})
      expect(isDisabledStub).toHaveBeenCalledTimes(1)
      expect(hooks.beforeRequest[0]).toBe(beforeRequest)
      expect(hooks.afterResponse[0]).toBe(afterResponse)
    })

    it('should log a http request', () => {
      const options = { url, method, headers: { foo: 'bar' }, body }

      beforeRequest(options)
      expect(requestStub).toHaveBeenCalledTimes(1)
      const [args] = requestStub.mock.calls[0]
      expect(args.url).toBe(url)
      expect(args.method).toBe(method)
      expect(args.body).toBe(body)
      expect(args.user).toBeUndefined()
      expect(args.headers.foo).toBe('bar')
      expect(args.headers['x-request-id']).toEqual(expect.any(Number))
    })

    it('should log the different types of users', () => {
      for (const key of ['user', 'email', 'sub', 'bearer', 'cn']) {
        requestStub.mockClear()
        const authorization = user.authorization(key)
        const options = { url, method, headers: { authorization }, body }
        if (key === 'cn') {
          Object.assign(options, { key: 'key', cert: user.cert })
        }
        beforeRequest(options)
        expect(requestStub).toHaveBeenCalledTimes(1)
        const [args] = requestStub.mock.calls[0]
        expect(args.user).toEqual({ type: key, id: user[key] })
        expect(args.headers.authorization).toBe(authorization)
      }
    })

    it('should log a http response', () => {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const response = { headers, httpVersion, statusCode, statusMessage, body, request }

      afterResponse(response)
      expect(responseStub).toHaveBeenCalledTimes(1)
      const [args] = responseStub.mock.calls[0]
      expect(args.id).toBe(xRequestId)
      expect(args.statusCode).toBe(statusCode)
      expect(args.statusMessage).toBe(statusMessage)
      expect(args.httpVersion).toBe(httpVersion)
      expect(args.headers.foo).toBe('bar')
      expect(args.body).toBe(body)
    })
  })
})
