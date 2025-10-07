//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import request from '@gardener-dashboard/request'
import HttpClient from '../lib/HttpClient.js'
import { assign } from '../lib/nonResourceEndpoints/index.js'
import { http } from '../lib/symbols.js'

describe('kube-client', () => {
  describe('non-resource-endpoints', () => {
    class EchoClient {
      constructor (options) {
        this.options = options
      }

      request (...args) {
        return Promise.resolve(args)
      }
    }

    const url = 'https://kubernetes/foo/bar'
    const relativeUrl = '/'
    const clientConfig = {
      extend (options) {
        return Object.assign(Object.create(this), options)
      },
    }
    const options = { url }
    let extendStub
    let endpoints

    beforeEach(() => {
      extendStub = jest
        .spyOn(request, 'extend')
        .mockImplementation(options => {
          return new EchoClient(options)
        })
      endpoints = assign({}, clientConfig, options)
    })

    it('should assign all non resource endpoints', () => {
      expect(Object.keys(endpoints)).toHaveLength(3)
      expect(extendStub).toHaveBeenCalledTimes(3)
      expect(endpoints.api).toBeInstanceOf(HttpClient)
      expect(endpoints.api[http.client].options).toEqual({
        url,
        relativeUrl,
        responseType: 'json',
      })
      expect(endpoints.healthz).toBeInstanceOf(HttpClient)
      expect(endpoints.healthz[http.client].options).toEqual({
        url,
        relativeUrl,
      })
      expect(endpoints.openapi).toBeInstanceOf(HttpClient)
      expect(endpoints.openapi[http.client].options).toEqual({
        url,
        relativeUrl,
        responseType: 'json',
      })
    })

    describe('healthz', () => {
      it('should fetch the healthz endpoint', async () => {
        await expect(endpoints.healthz.get()).resolves.toEqual(['healthz', { method: 'get' }])
      })
    })

    describe('openapi', () => {
      it('should fetch the openapi/v3/apis/core.gardener.cloud/v1beta1', async () => {
        await expect(endpoints.openapi.getGardenerApis()).resolves.toEqual(['openapi/v3/apis/core.gardener.cloud/v1beta1', { method: 'get' }])
      })
    })

    describe('API', () => {
      it('should fetch the api endpoint', async () => {
        await expect(endpoints.api.get()).resolves.toEqual(['api', { method: 'get' }])
      })
    })
  })
})
