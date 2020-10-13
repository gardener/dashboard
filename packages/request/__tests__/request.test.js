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

const got = require('got')
const http = require('http')
const https = require('https')
const createError = require('http-errors')
const { HttpClient, extend, isHttpError, createHttpError } = require('../lib')

describe('request', function () {
  const prefixUrl = 'http://foo.bar/baz'
  let extendStub

  beforeEach(function () {
    extendStub = jest
      .spyOn(got, 'extend')
      .mockImplementation(options => {
        return { defaults: { options } }
      })
  })

  describe('HttpClient', function () {
    describe('#constructor', function () {
      it('should create a new object', function () {
        const client = new HttpClient({ prefixUrl })
        expect(client).toBeInstanceOf(HttpClient)
        expect(extendStub).toHaveBeenCalledTimes(1)
      })

      it('should throw a type error', function () {
        expect(() => {
          // eslint-disable-next-line no-unused-vars
          const client = new HttpClient()
        }).toThrowError(TypeError)
        expect(extendStub).toHaveBeenCalledTimes(0)
      })
    })

    describe('#defaults', function () {
      it('should return the default options', function () {
        const foo = 'bar'
        const options = { prefixUrl, foo }
        const client = new HttpClient(options)
        expect(client.defaults.options).toEqual(options)
      })
    })

    describe('#request', function () {
      it('should throw a HttpError', async function () {
        const statusCode = 418
        const statusMessage = http.STATUS_CODES[statusCode]
        const body = statusMessage
        const headers = {
          'content-length': body.length,
          'content-type': 'text/plain'
        }
        const response = { statusCode, statusMessage, headers, body }
        extendStub.mockImplementation(options => {
          return url => {
            expect(url).toBe('test')
            const err = new got.HTTPError(response)
            Reflect.defineProperty(err, 'response', {
              value: response
            })
            return new Promise((resolve, reject) => {
              process.nextTick(() => reject(err))
            })
          }
        })
        const client = new HttpClient({ prefixUrl })
        expect.assertions(3)
        try {
          await client.request('test')
        } catch (err) {
          /* eslint-disable jest/no-try-expect */
          expect(isHttpError(err, 418)).toBe(true)
          expect(err).toMatchObject({
            statusCode,
            statusMessage,
            headers,
            body
          })
        }
      })

      it('should throw an Error', async function () {
        const error = new Error('message')
        extendStub.mockImplementation(options => {
          return url => {
            expect(url).toBe('test')
            return new Promise((resolve, reject) => {
              process.nextTick(() => reject(error))
            })
          }
        })
        const client = new HttpClient({ prefixUrl })
        expect.assertions(2)
        await expect(client.request('test')).rejects.toBe(error)
      })
    })

    describe('#normalizeOptions', function () {
      it('should normalize empty options', function () {
        const options = HttpClient.normalizeOptions()
        expect(options).toEqual({})
      })

      it('should normalize https options', function () {
        const key = 'key'
        const cert = 'cert'
        const ca = 'ca'
        let options
        options = HttpClient.normalizeOptions({
          key,
          cert
        })
        expect(options.https).toEqual({
          key,
          certificate: cert
        })
        options = HttpClient.normalizeOptions({
          ca
        })
        expect(options.https).toEqual({
          certificateAuthority: ca
        })
        options = HttpClient.normalizeOptions({
          rejectUnauthorized: false
        })
        expect(options.https).toEqual({
          rejectUnauthorized: false
        })
      })

      it('should normalize agent options', function () {
        const httpAgent = new http.Agent()
        const httpsAgent = new https.Agent()
        const unknownAgent = {}
        let options
        options = HttpClient.normalizeOptions({
          agent: httpAgent
        })
        expect(options.agent.http).toBe(httpAgent)
        options = HttpClient.normalizeOptions({
          agent: httpsAgent
        })
        expect(options.agent.https).toBe(httpsAgent)
        options = HttpClient.normalizeOptions({
          agent: unknownAgent
        })
        expect(options.agent).toBeUndefined()
      })
    })

    describe('#denormalizeOptions', function () {
      it('should denormalize https options', function () {
        const key = 'key'
        const cert = 'cert'
        const ca = 'ca'
        let options
        options = HttpClient.denormalizeOptions({
          https: {
            key,
            certificate: cert
          }
        })
        expect(options).toEqual({
          key,
          cert
        })
        options = HttpClient.denormalizeOptions({
          https: {
            certificateAuthority: ca
          }
        })
        expect(options).toEqual({
          ca
        })
        options = HttpClient.denormalizeOptions({
          https: {
            rejectUnauthorized: false
          }
        })
        expect(options).toEqual({
          rejectUnauthorized: false
        })
      })

      it('should denormalize agent options', function () {
        const httpAgent = new http.Agent()
        const httpsAgent = new https.Agent()
        let options
        options = HttpClient.denormalizeOptions({
          agent: {
            http: httpAgent
          }
        })
        expect(options.agent).toBe(httpAgent)
        options = HttpClient.denormalizeOptions({
          agent: {
            https: httpsAgent
          }
        })
        expect(options.agent).toBe(httpsAgent)
      })
    })
  })

  describe('#extend', function () {
    it('should create a http client', function () {
      const client = extend({ prefixUrl })
      expect(client).toBeInstanceOf(HttpClient)
      expect(extendStub).toHaveBeenCalledTimes(1)
    })
  })

  describe('#isHttpError', function () {
    it('should check if an error is a HTTP error', function () {
      expect(isHttpError(new Error('message'))).toBe(false)
      expect(isHttpError(createError(404))).toBe(true)
      expect(isHttpError(createError(404), 404)).toBe(true)
      expect(isHttpError(createError(404), 410)).toBe(false)
      expect(isHttpError(createError(404), [410, 404])).toBe(true)
      expect(isHttpError(createError(404), [401, 403])).toBe(false)
    })
  })

  describe('#createHttpError', function () {
    it('should create different HTTP errors', function () {
      const error = createHttpError({ statusCode: 404 })
      expect(error).toMatchObject({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Response code 404 (Not Found)'
      })
    })
  })
})
