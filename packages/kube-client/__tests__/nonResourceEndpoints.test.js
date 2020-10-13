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

const request = require('@gardener-dashboard/request')
const HttpClient = require('../lib/HttpClient')
const { assign } = require('../lib/nonResourceEndpoints')
const { http: httpSymbol } = require('../lib/symbols')

describe('http-client', () => {
  class EchoClient {
    constructor (options) {
      this.options = options
    }

    request (...args) {
      return args
    }
  }
  const url = 'https://kubernetes/foo/bar'
  const options = { url, agent: false }
  let extendStub
  let endpoints

  beforeEach(() => {
    // eslint-disable-next-line no-unused-vars
    extendStub = jest
      .spyOn(request, 'extend')
      .mockImplementation(options => {
        return new EchoClient(options)
      })
    endpoints = assign({}, options)
  })

  it('should assign all non resource endpoints', () => {
    expect(Object.keys(endpoints)).toHaveLength(2)
    expect(endpoints.healthz).toBeInstanceOf(HttpClient)
    expect(endpoints.healthz[httpSymbol.client].options).toEqual({
      prefixUrl: url,
      agent: false
    })
    expect(endpoints.openapi).toBeInstanceOf(HttpClient)
    expect(endpoints.openapi[httpSymbol.client].options).toEqual({
      prefixUrl: url,
      agent: false,
      responseType: 'json'
    })
  })

  describe('healthz', () => {
    it('should fetch the healthz endpoint', async () => {
      await expect(endpoints.healthz.get()).resolves.toEqual(['healthz', { method: 'get' }])
    })
  })

  describe('openapi', () => {
    it('should fetch the openapi/v2 endpoint', async () => {
      await expect(endpoints.openapi.get()).resolves.toEqual(['openapi/v2', { method: 'get' }])
    })
  })
})
