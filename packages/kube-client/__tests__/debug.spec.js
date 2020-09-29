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

const jwt = require('jsonwebtoken')

const { globalLogger: logger } = require('@gardener-dashboard/logger')
const { attach, beforeRequest, beforeRedirect, afterResponse } = require('../lib/debug')

describe('kube-client', function () {
  describe('debug', function () {
    const uuidRegEx = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
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
      }
    }

    let isDisabledStub
    let requestStub
    let responseStub

    beforeEach(function () {
      isDisabledStub = jest.spyOn(logger, 'isDisabled').mockReturnValue(false)
      requestStub = jest.spyOn(logger, 'request').mockImplementation(() => {})
      responseStub = jest.spyOn(logger, 'response').mockImplementation(() => {})
    })

    it('should attach debug hooks', function () {
      const { hooks } = attach({})
      expect(isDisabledStub).toHaveBeenCalledTimes(1)
      expect(hooks.beforeRequest[0]).toBe(beforeRequest)
      expect(hooks.afterResponse[0]).toBe(afterResponse)
      expect(hooks.beforeRedirect[0]).toBe(beforeRedirect)
    })

    it('should log a http request', function () {
      const options = { url, method, headers: { foo: 'bar' }, body }

      beforeRequest(options)
      expect(requestStub).toHaveBeenCalledTimes(1)
      const [args] = requestStub.mock.calls[0]
      expect(args.url).toBe(url)
      expect(args.method).toBe(method)
      expect(args.body).toBe(body)
      expect(args.user).toBeUndefined()
      expect(args.headers.foo).toBe('bar')
      expect(args.headers['x-request-id']).toMatch(uuidRegEx)
    })

    it('should log the different types of users', function () {
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

    it('should log a http response', function () {
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

    it('should log a http redirect', function () {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const options = { url, method, headers, body }
      const redirectUrls = ['http://foo.org/bar']
      const response = { headers, httpVersion, statusCode, statusMessage, redirectUrls, request }

      beforeRedirect(options, response)
      expect(responseStub).toHaveBeenCalledTimes(1)
      expect(requestStub).toHaveBeenCalledTimes(1)
      const [args] = responseStub.mock.calls[0]
      expect(args.id).toBe(xRequestId)
      expect(args.statusCode).toBe(statusCode)
      expect(args.statusMessage).toBe(statusMessage)
      expect(args.httpVersion).toBe(httpVersion)
      expect(args.headers.foo).toBe('bar')
      expect(JSON.parse(args.body)).toEqual({ redirectUrls })
    })
  })
})
