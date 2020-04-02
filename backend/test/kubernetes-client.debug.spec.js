//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const logger = require('../lib/logger')
const { attach, beforeRequest, beforeRedirect, afterResponse } = require('../lib/kubernetes-client/debug')

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

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
      isDisabledStub = sandbox.stub(logger, 'isDisabled').returns(false)
      requestStub = sandbox.stub(logger, 'request')
      responseStub = sandbox.stub(logger, 'response')
    })

    it('should attach debug hooks', function () {
      const { hooks } = attach({})
      expect(isDisabledStub).to.be.calledOnce
      expect(hooks.beforeRequest[0]).to.equal(beforeRequest)
      expect(hooks.afterResponse[0]).to.equal(afterResponse)
      expect(hooks.beforeRedirect[0]).to.equal(beforeRedirect)
    })

    it('should log a http request', function () {
      const options = { url, method, headers: { foo: 'bar' }, body }

      beforeRequest(options)
      expect(requestStub).to.be.calledOnce
      const args = requestStub.firstCall.args[0]
      expect(args.url).to.equal(url)
      expect(args.method).to.equal(method)
      expect(args.body).to.equal(body)
      expect(args.user).to.be.undefined
      expect(args.headers.foo).to.equal('bar')
      expect(args.headers['x-request-id']).to.match(uuidRegEx)
    })

    it('should log the different types of users', function () {
      for (const key of ['user', 'email', 'sub', 'bearer', 'cn']) {
        requestStub.resetHistory()
        const authorization = user.authorization(key)
        const options = { url, method, headers: { authorization }, body }
        if (key === 'cn') {
          Object.assign(options, { key: 'key', cert: user.cert })
        }
        beforeRequest(options)
        expect(requestStub).to.be.calledOnce
        const args = requestStub.firstCall.args[0]
        expect(args.user).to.eql({ type: key, id: user[key] })
        expect(args.headers.authorization).to.equal(authorization)
      }
    })

    it('should log a http response', function () {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const response = { headers, httpVersion, statusCode, statusMessage, body, request }

      afterResponse(response)
      expect(responseStub).to.be.calledOnce
      const args = responseStub.firstCall.args[0]
      expect(args.id).to.equal(xRequestId)
      expect(args.statusCode).to.equal(statusCode)
      expect(args.statusMessage).to.equal(statusMessage)
      expect(args.httpVersion).to.equal(httpVersion)
      expect(args.headers.foo).to.equal('bar')
      expect(args.body).to.equal(body)
    })

    it('should log a http redirect', function () {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const options = { url, method, headers, body }
      const redirectUrls = ['http://foo.org/bar']
      const response = { headers, httpVersion, statusCode, statusMessage, redirectUrls, request }

      beforeRedirect(options, response)
      expect(responseStub).to.be.calledOnce
      expect(requestStub).to.be.calledOnce
      const args = responseStub.firstCall.args[0]
      expect(args.id).to.equal(xRequestId)
      expect(args.statusCode).to.equal(statusCode)
      expect(args.statusMessage).to.equal(statusMessage)
      expect(args.httpVersion).to.equal(httpVersion)
      expect(args.headers.foo).to.equal('bar')
      expect(JSON.parse(args.body)).to.eql({ redirectUrls })
    })
  })
})
