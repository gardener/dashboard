//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import fetchWrapper, { registry, isHttpError } from '@/utils/fetch'

describe('utils', () => {
  describe('fetch', () => {
    const url = 'http://example.org/test'

    afterEach(() => {
      fetch.resetMocks()
    })

    it('should respond with status 200 and json content', async () => {
      const status = 200
      const data = { foo: 'bar' }
      fetch.mockResponseOnce(JSON.stringify(data), {
        status,
        headers: {
          'content-type': 'application/json; charset=UTF-8'
        }
      })
      const res = await fetchWrapper(url)
      expect(res.status).toBe(status)
      expect(res.data).toEqual(data)
    })

    it('should respond with status 200 and text content', async () => {
      const status = 200
      const text = 'foobar'
      fetch.mockResponseOnce(text, {
        status,
        headers: {
          'content-type': 'text/plain; charset=UTF-8'
        }
      })
      const res = await fetchWrapper(url)
      expect(res.status).toBe(status)
      expect(res.data).toEqual(text)
    })

    it('should respond with status 100', async () => {
      const status = 100
      fetch.mockResponseOnce(null, {
        status
      })
      await expect(fetchWrapper(url)).rejects.toThrowError(`Unexpected informational response with status code ${status}`)
    })

    it('should respond with status 300', async () => {
      const status = 300
      fetch.mockResponseOnce(null, {
        status
      })
      await expect(fetchWrapper(url)).rejects.toThrowError(`Unexpected redirection response with status code ${status}`)
    })

    it('should respond with status 401', async () => {
      const status = 401
      fetch.mockResponseOnce(null, {
        status
      })
      await expect(fetchWrapper(url)).rejects.toThrowError('Authentication failed')
    })

    it('should respond with status 500', async () => {
      const status = 500
      fetch.mockResponseOnce(null, {
        status
      })
      await expect(fetchWrapper(url)).rejects.toThrowError(`Request failed with status code ${status}`)
    })

    it('should reject with an error', async () => {
      const error = new Error('error message')
      fetch.mockRejectOnce(error)
      await expect(fetchWrapper(url)).rejects.toThrowError(error)
    })

    it('should send a request with json content', async () => {
      const data = { foo: 'bar' }
      fetch.mockResponseOnce('ok')
      const res = await fetchWrapper(url, { method: 'POST', body: data })
      expect(res.data).toEqual('ok')
      expect(fetch).toBeCalledTimes(1)
      const [req] = fetch.mock.calls[0]
      expect(res.request).toBe(req)
      expect(Object.fromEntries(req.headers)).toEqual({
        accept: 'application/json, text/*;q=0.9, */*;q=0.8',
        'x-requested-with': 'XMLHttpRequest',
        'content-type': 'application/json; charset=UTF-8'
      })
      expect(JSON.parse(req.body)).toEqual(data)
    })

    it('should send a request with text content', async () => {
      const text = 'foobar'
      fetch.mockResponseOnce('ok')
      const res = await fetchWrapper(url, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain; charset=UTF-8'
        },
        body: text
      })
      expect(res.data).toEqual('ok')
      expect(fetch).toBeCalledTimes(1)
      const [req] = fetch.mock.calls[0]
      expect(res.request).toBe(req)
      expect(Object.fromEntries(req.headers)).toEqual({
        accept: 'application/json, text/*;q=0.9, */*;q=0.8',
        'x-requested-with': 'XMLHttpRequest',
        'content-type': 'text/plain; charset=UTF-8'
      })
      expect(req.body.toString('utf8')).toEqual(text)
    })

    describe('intercepting the fetch response', () => {
      let unregister

      beforeEach(() => {
        unregister = registry.register({
          response (res) {
            res.headerMap.set('foo', 'bar')
            return Promise.resolve(res)
          },
          error (err) {
            return Promise.reject(err)
          }
        })
      })

      afterEach(() => {
        registry.clear()
      })

      it('should intercepted a response and set a header field', async () => {
        fetch.mockResponseOnce('ok')
        const res = await fetchWrapper(url)
        expect(res.headers.foo).toBe('bar')
      })

      it('should intercepted an http error', async () => {
        unregister()
        expect(registry.size).toBe(0)
        registry.register({
          error (err) {
            return isHttpError(err) && err.status === 401
              ? Promise.resolve(err.response.data)
              : Promise.reject(err)
          }
        })
        const status = 401
        const data = { status, reason: 'Authentication failed' }
        fetch.mockResponseOnce(JSON.stringify(data), {
          status,
          headers: {
            'content-type': 'application/json; charset=UTF-8'
          }
        })
        await expect(fetchWrapper(url)).resolves.toEqual(data)
      })

      it('should unregister the default interceptor twice', async () => {
        expect(registry.size).toBe(1)
        unregister()
        expect(registry.size).toBe(0)
        unregister()
        expect(registry.size).toBe(0)
      })

      it('should register an empty interceptor', async () => {
        unregister()
        registry.register({})
        expect(registry.size).toBe(1)
        fetch.mockResponseOnce('ok')
        const res = await fetchWrapper(url)
        expect(res.headers.foo).toBeUndefined()
      })
    })
  })
})
