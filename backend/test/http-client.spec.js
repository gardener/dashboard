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
const { extend, HTTPClient, HTTPError } = require('@gardener-dashboard/http-client')

describe('http-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  const prefixUrl = 'http://foo.bar/baz'
  let extendStub

  beforeEach(function () {
    extendStub = sandbox
      .stub(got, 'extend')
      .callsFake(options => {
        return { defaults: { options } }
      })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('#extend', function () {
    it('should create a http client', function () {
      const client = extend({ prefixUrl })
      expect(client).to.be.instanceOf(HTTPClient)
      expect(extendStub).to.be.calledOnce
    })
  })

  describe('HTTPClient', function () {
    describe('#constructor', function () {
      it('should create a new object', function () {
        const client = new HTTPClient({ prefixUrl })
        expect(client).to.be.instanceOf(HTTPClient)
        expect(extendStub).to.be.calledOnce
      })

      it('should throw a type error', function () {
        expect(() => {
          // eslint-disable-next-line no-unused-vars
          const client = new HTTPClient()
        }).to.throw(TypeError, ('prefixUrl is required'))
        expect(extendStub).not.to.be.called
      })
    })

    describe('#defaults', function () {
      it('should return the default options', function () {
        const foo = 'bar'
        const options = { prefixUrl, foo }
        const client = new HTTPClient(options)
        expect(client.defaults.options).to.eql(options)
      })
    })

    describe('#request', function () {
      it('should throw a HTTPError', async function () {
        const response = {
          statusCode: 500,
          statusMessage: 'Internal Server Error'
        }
        extendStub.callsFake(options => {
          return url => {
            expect(url).to.equal('test')
            const err = new got.HTTPError(response)
            Object.defineProperty(err, 'response', {
              value: response
            })
            return new Promise((resolve, reject) => {
              process.nextTick(() => reject(err))
            })
          }
        })
        const client = new HTTPClient({ prefixUrl })
        try {
          await client.request('test')
          expect.fail('expected request to throw a HTTPError')
        } catch (err) {
          expect(err).to.be.instanceOf(HTTPError)
          expect(err.response).to.equal(response)
        }
      })

      it('should throw an Error', async function () {
        const error = new Error('message')
        extendStub.callsFake(options => {
          return url => {
            expect(url).to.equal('test')
            return new Promise((resolve, reject) => {
              process.nextTick(() => reject(error))
            })
          }
        })
        const client = new HTTPClient({ prefixUrl })
        try {
          await client.request('test')
          expect.fail('expected request to throw an Error')
        } catch (err) {
          expect(err).to.equal(error)
        }
      })
    })

    describe('#normalizeOptions', function () {
      it('should normalize empty options', function () {
        const options = HTTPClient.normalizeOptions()
        expect(options).to.eql({})
      })

      it('should normalize https options', function () {
        const key = 'key'
        const cert = 'cert'
        const ca = 'ca'
        let options
        options = HTTPClient.normalizeOptions({
          key,
          cert
        })
        expect(options.https).to.eql({
          key,
          certificate: cert
        })
        options = HTTPClient.normalizeOptions({
          ca
        })
        expect(options.https).to.eql({
          certificateAuthority: ca
        })
        options = HTTPClient.normalizeOptions({
          rejectUnauthorized: false
        })
        expect(options.https).to.eql({
          rejectUnauthorized: false
        })
      })

      it('should normalize agent options', function () {
        const httpAgent = new http.Agent()
        const httpsAgent = new https.Agent()
        const unknownAgent = {}
        let options
        options = HTTPClient.normalizeOptions({
          agent: httpAgent
        })
        expect(options.agent.http).to.equal(httpAgent)
        options = HTTPClient.normalizeOptions({
          agent: httpsAgent
        })
        expect(options.agent.https).to.equal(httpsAgent)
        options = HTTPClient.normalizeOptions({
          agent: unknownAgent
        })
        expect(options.agent).to.be.undefined
      })
    })

    describe('#denormalizeOptions', function () {
      it('should denormalize https options', function () {
        const key = 'key'
        const cert = 'cert'
        const ca = 'ca'
        let options
        options = HTTPClient.denormalizeOptions({
          https: {
            key,
            certificate: cert
          }
        })
        expect(options).to.eql({
          key,
          cert
        })
        options = HTTPClient.denormalizeOptions({
          https: {
            certificateAuthority: ca
          }
        })
        expect(options).to.eql({
          ca
        })
        options = HTTPClient.denormalizeOptions({
          https: {
            rejectUnauthorized: false
          }
        })
        expect(options).to.eql({
          rejectUnauthorized: false
        })
      })

      it('should denormalize agent options', function () {
        const httpAgent = new http.Agent()
        const httpsAgent = new https.Agent()
        let options
        options = HTTPClient.denormalizeOptions({
          agent: {
            http: httpAgent
          }
        })
        expect(options.agent).to.equal(httpAgent)
        options = HTTPClient.denormalizeOptions({
          agent: {
            https: httpsAgent
          }
        })
        expect(options.agent).to.equal(httpsAgent)
      })
    })
  })
})
