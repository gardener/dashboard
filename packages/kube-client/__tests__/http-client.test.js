//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { extend, mockClient } = require('@gardener-dashboard/request')

const { GatewayTimeout } = require('http-errors')
const HttpClient = require('../lib/HttpClient')
const { http } = require('../lib/symbols')

const { delay } = fixtures.helper

class TestClient extends HttpClient {
  request (...args) {
    return this[http.request](...args)
  }

  stream (...args) {
    return this[http.stream](...args)
  }
}

async function writeNumbers (stream, max = 10) {
  for (let i = 0; i <= max; i++) {
    await delay(i)
    stream.write({ object: Number(i) })
  }
  stream.end()
}

describe('kube-client', () => {
  describe('HttpClient', () => {
    const options = {
      url: 'https://127.0.0.1:31415/test'
    }
    const url = 'url'
    const method = 'GET'

    let testClient

    beforeEach(() => {
      jest.clearAllMocks()
      testClient = new TestClient(options)
    })

    it('should create a HttpClient instance', () => {
      expect(extend).toBeCalledTimes(1)
      expect(extend.mock.calls[0]).toEqual([options])
      expect(testClient[http.client]).toBe(mockClient)
    })

    it('should call the request method with empty searchParams', async () => {
      const searchParams = new URLSearchParams()
      await testClient.request(url, { method, searchParams })
      expect(mockClient.request).toBeCalledTimes(1)
      expect(mockClient.request.mock.calls[0]).toEqual([url, { method }])
    })

    it('should call the request method with searchParams', async () => {
      const searchParams = new URLSearchParams({ foo: 'bar' })
      await testClient.request(url, { method, searchParams })
      expect(mockClient.request).toBeCalledTimes(1)
      expect(mockClient.request.mock.calls[0]).toEqual([url, { method, searchParams }])
    })

    it('should wait until the condition is met', async () => {
      const response = await testClient.stream(url, { method })
      writeNumbers(response)
      expect(mockClient.stream).toBeCalledTimes(1)
      expect(mockClient.stream.mock.calls[0]).toEqual([url, { method }])
      expect(typeof response.until).toBe('function')
      const value = await response.until(event => [event.object > 3, event.object])
      expect(value).toBe(4)
    })

    it('should timeout while waiting for a condition to be met', async () => {
      TestClient.names = { plural: 'dummies' }
      const response = await testClient.stream(url, { method })
      const destroySpy = jest.spyOn(response, 'destroy')
      writeNumbers(response)
      expect(mockClient.stream).toBeCalledTimes(1)
      expect(mockClient.stream.mock.calls[0]).toEqual([url, { method }])
      expect(typeof response.until).toBe('function')
      await expect(response.until(event => event.object > 9, { timeout: 10 })).rejects.toThrow(GatewayTimeout)
      expect(destroySpy).toBeCalled()
      expect(destroySpy.mock.calls[0]).toHaveLength(1)
      expect(destroySpy.mock.calls[0][0].message).toMatch(/"dummies" .* 10 ms/)
    })
  })
})
