//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import http2 from 'http2'
import zlib from 'zlib'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import client from '../lib/index.js'
import { isRequestTimeoutAbort, mapTimeoutAbortError } from '../lib/Client.js'

const { Client, extend } = client

const {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_AUTHORIZATION,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_ACCEPT_ENCODING,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_POST,
  HTTP2_HEADER_STATUS,
} = http2.constants

describe('Client', () => {
  const url = new URL('https://127.0.0.1:31415/test')
  const xRequestId = '4711'
  const statusCode = 200
  const contentType = 'application/json'
  const contentLength = 42
  let agent
  let client
  let stream

  beforeEach(() => {
    const mockBody = vi.fn().mockReturnValue({
      foo: 'bar',
      bar: 'foo',
    })
    const mockHeaders = vi.fn().mockReturnValue({
      [HTTP2_HEADER_STATUS]: statusCode,
      [HTTP2_HEADER_CONTENT_TYPE]: contentType,
      [HTTP2_HEADER_CONTENT_LENGTH]: contentLength,
    })
    const asyncIterator = function * () {
      yield Buffer.from('{')
      let separator
      for (const [key, value] of Object.entries(this.mockBody())) {
        if (!separator) {
          separator = ','
        } else {
          yield Buffer.from(separator)
        }
        yield Buffer.from(JSON.stringify(key))
        yield Buffer.from(':')
        yield Buffer.from(JSON.stringify(value))
      }
      yield Buffer.from('}')
    }
    stream = {
      close: vi.fn(),
      destroy: vi.fn(),
      end: vi.fn(),
      once: vi.fn(),
      mockBody,
      mockHeaders,
      getHeaders () {
        return Promise.resolve(mockHeaders())
      },
      setEncoding: vi.fn(),
      [Symbol.asyncIterator]: asyncIterator,
    }
    agent = {
      request: vi.fn().mockResolvedValue(stream),
    }
    client = new Client({
      url,
      agent,
      headers: {
        'X-Request-Id': xRequestId,
      },
    })
  })

  describe('#constructor', () => {
    it('should create a new object', () => {
      expect(client).toBeInstanceOf(Client)
      expect(client.baseUrl.href).toBe(url.href)
    })

    it('should throw a type error', () => {
      expect(() => new Client()).toThrow(TypeError)
    })

    it('should create an instance with url and relativeUrl', () => {
      client = new Client({
        url: url.origin,
        relativeUrl: url.pathname,
      })
      expect(client.baseUrl.href).toBe(url.href)
    })

    it('should create an instance with url path preserved', () => {
      client = new Client({
        url: url.href,
        relativeUrl: 'foo/bar',
      })
      expect(url.href.endsWith('/')).toBe(false)
      expect(client.baseUrl.href).toBe(url.href + '/foo/bar')
    })

    it('should create an instance with bearer authorization', () => {
      client = new Client({
        url,
        auth: {
          bearer: 'token',
        },
      })
      const headers = client.getRequestHeaders()
      expect(headers[HTTP2_HEADER_AUTHORIZATION]).toBe('Bearer token')
    })

    it('should create an instance with basic authorization', () => {
      client = new Client({
        url,
        auth: {
          user: 'a',
          pass: 'b',
        },
      })
      const headers = client.getRequestHeaders()
      expect(headers[HTTP2_HEADER_AUTHORIZATION]).toBe('Basic YTpi')
    })
  })

  describe('#executeHooks', () => {
    const message = 'Hook execution failed'

    it('should run all hooks', () => {
      const beforeRequestSpy = vi.fn()
      const afterResponseSpy = vi.fn(() => {
        throw new Error(message)
      })
      const client = new Client({
        url,
        hooks: {
          beforeRequest: [beforeRequestSpy],
          afterResponse: [afterResponseSpy],
        },
      })
      const args = ['a', 2, true]
      client.executeHooks('beforeRequest', ...args)
      expect(beforeRequestSpy).toHaveBeenCalledTimes(1)
      expect(beforeRequestSpy.mock.calls[0]).toEqual(args)
      expect(afterResponseSpy).not.toHaveBeenCalled()
      client.executeHooks('afterResponse')
      expect(afterResponseSpy).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenLastCalledWith('Failed to execute "afterResponse" hooks', message)
    })
  })

  describe('#getRequestHeaders', () => {
    const defaultRequestHeaders = {
      [HTTP2_HEADER_SCHEME]: 'https',
      [HTTP2_HEADER_AUTHORITY]: '127.0.0.1:31415',
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/test',
      [HTTP2_HEADER_ACCEPT_ENCODING]: 'gzip, deflate, br',
      'x-request-id': xRequestId,
    }

    it('should return request header defaults', () => {
      expect(client.getRequestHeaders()).toEqual({
        ...defaultRequestHeaders,
      })
    })

    it('should return request headers with absolute path', () => {
      expect(client.getRequestHeaders('/absolute/path')).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/absolute/path',
      })
    })

    it('should return request headers with relative path', () => {
      expect(client.getRequestHeaders('relative/path')).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/test/relative/path',
      })
    })

    it('should return request headers with search params', () => {
      const searchParams = new URLSearchParams({ foo: 'bar' })
      const search = '?' + searchParams
      expect(client.getRequestHeaders('path', {
        method: 'post',
        searchParams,
      })).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/test/path' + search,
      })
    })

    it('should return request headers with query params', () => {
      const query = { foo: 'bar' }
      const search = '?' + new URLSearchParams(query)
      expect(client.getRequestHeaders('path', {
        searchParams: { foo: 'bar' },
      })).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/test/path' + search,
      })
    })
  })

  describe('#fetch', () => {
    it('should successfully return a response', async () => {
      const response = await client.fetch()
      expect(response).toMatchObject({
        headers: stream.mockHeaders(),
        statusCode,
        contentType,
        contentLength,
        type: 'json',
        ok: true,
        redirected: false,
      })
      const body = await response.body()
      expect(body).toEqual(stream.mockBody())
    })

    it('should timeout when a request exceeds its deadline before headers arrive', async () => {
      const requestTimeout = 10
      const message = `Request exceeded ${requestTimeout} ms for GET /test/foo/bar`
      client = new Client({
        url,
        agent,
        requestTimeout,
      })
      let signal
      let resolveGetHeadersCalled
      const getHeadersCalled = new Promise(resolve => {
        resolveGetHeadersCalled = resolve
      })
      agent.request.mockImplementation(async (headers, options) => {
        signal = options.signal
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          err.code = 'ABORT_ERR'
          err.cause = signal.reason
          stream.destroy(err)
        }, { once: true })
        return stream
      })
      stream.getHeaders = vi.fn(() => {
        resolveGetHeadersCalled()
        return new Promise((resolve, reject) => {
          stream.destroy.mockImplementation(reject)
        })
      })

      const promise = client.fetch('foo/bar?token=secret')
      await getHeadersCalled
      const err = await promise.catch(err => err)

      expect(err).toMatchObject({
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
        message,
      })
      expect(err.cause).toMatchObject({
        name: 'AbortError',
        code: 'ABORT_ERR',
      })
      expect(stream.getHeaders).toHaveBeenCalledTimes(1)
      expect(stream.destroy).toHaveBeenCalledTimes(1)
      expect(stream.destroy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'AbortError',
        code: 'ABORT_ERR',
      }))
    })

    it('should not create a timeout signal when requestTimeout is 0', async () => {
      await client.fetch('foo/bar', { requestTimeout: 0 })

      expect(agent.request).toHaveBeenCalledTimes(1)
      expect(agent.request.mock.calls[0][1].signal).toBeUndefined()
    })

    it('should surface a caller-triggered abort as AbortError, not TimeoutError', async () => {
      const requestTimeout = 60_000
      client = new Client({
        url,
        agent,
        requestTimeout,
      })
      const abortController = new AbortController()
      let resolveGetHeadersCalled
      const getHeadersCalled = new Promise(resolve => {
        resolveGetHeadersCalled = resolve
      })
      agent.request.mockImplementation(async (headers, options) => {
        const signal = options.signal
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          err.code = 'ABORT_ERR'
          err.cause = signal.reason
          stream.destroy(err)
        }, { once: true })
        return stream
      })
      stream.getHeaders = vi.fn(() => {
        resolveGetHeadersCalled()
        return new Promise((resolve, reject) => {
          stream.destroy.mockImplementation(reject)
        })
      })

      const promise = client.fetch('foo/bar', { signal: abortController.signal })
      await getHeadersCalled
      abortController.abort()
      const err = await promise.catch(err => err)

      expect(err).toMatchObject({
        name: 'AbortError',
        code: 'ABORT_ERR',
      })
      expect(err.name).not.toBe('TimeoutError')
    })

    describe('when the server returns plain text for a JSON endpoint', () => {
      const contentType = 'text/plain'
      const chunks = ['foo', '-', 'bar']
      const rawBody = chunks.join('')
      const parseErrorMessage = () => {
        try {
          JSON.parse(rawBody)
        } catch (err) {
          return err.message
        }
      }

      let statusCode

      beforeEach(() => {
        statusCode = 200
        stream.mockHeaders.mockImplementation(() => {
          return {
            [HTTP2_HEADER_STATUS]: statusCode,
            [HTTP2_HEADER_CONTENT_TYPE]: contentType,
          }
        })
        stream[Symbol.asyncIterator] = function * () {
          for (const chunk of chunks) {
            yield chunk
          }
        }
        client.responseType = 'json'
      })

      it('should throw a ParseError for invalid json on success', async () => {
        statusCode = 200
        const response = await client.fetch()
        expect(response.contentType).toBe(contentType)
        await expect(response.body()).rejects.toMatchObject({
          name: 'ParseError',
          message: parseErrorMessage(),
          rawBody,
        })
      })

      it('should return a response with plain text body on failure', async () => {
        statusCode = 500
        const response = await client.fetch()
        expect(response.contentType).toBe(contentType)
        await expect(response.body()).resolves.toBe(rawBody)
      })
    })

    it('should return a response with responseType "text"', async () => {
      client.responseType = 'text'
      const response = await client.fetch()
      expect(response.type).toBe('text')
    })

    it('should return a response and destroy the stream', async () => {
      client.responseType = 'text'
      const response = await client.fetch()
      const error = new Error('error')
      response.destroy(error)
      expect(stream.destroy).toHaveBeenCalledTimes(1)
      expect(stream.destroy.mock.calls[0]).toEqual([error])
    })
  })

  describe('#stream', () => {
    it('should successfully return a response', async () => {
      const statusCode = 200
      const response = {
        statusCode,
      }
      client.fetch = vi.fn().mockResolvedValue(response)
      await expect(client.stream()).resolves.toBe(response)
      expect(client.fetch).toHaveBeenCalledWith(undefined, { requestTimeout: 0 })
    })

    it('should allow direct stream callers to override requestTimeout', async () => {
      const statusCode = 200
      const response = {
        statusCode,
      }
      client.fetch = vi.fn().mockResolvedValue(response)
      await expect(client.stream('events', { requestTimeout: 100 })).resolves.toBe(response)
      expect(client.fetch).toHaveBeenCalledWith('events', { requestTimeout: 100 })
    })

    it('should throw a NotFound error', async () => {
      const statusCode = 404
      const headers = {
        [HTTP2_HEADER_STATUS]: statusCode,
      }
      const body = 'body'
      const response = {
        headers,
        statusCode,
        body: vi.fn().mockResolvedValue(body),
      }
      client.fetch = vi.fn().mockResolvedValue(response)
      await expect(client.stream()).rejects.toEqual(expect.objectContaining({
        name: 'NotFoundError',
        headers,
        statusCode,
        body,
      }))
    })
  })

  describe('#defaults', () => {
    it('should return the default options', () => {
      const foo = 'bar'
      const options = { url, foo }
      const client = new Client(options)
      expect(client.defaults.options).toEqual(options)
    })
  })

  describe('#extend', () => {
    it('should create a http client', () => {
      const client = extend({ url })
      expect(client).toBeInstanceOf(Client)
    })
  })

  describe('#createDecompressor', () => {
    it('should create a decompressor', () => {
      expect(Client.createDecompressor('br')).toBeInstanceOf(zlib.BrotliDecompress)
      expect(Client.createDecompressor('gzip')).toBeInstanceOf(zlib.Gunzip)
      expect(Client.createDecompressor('deflate')).toBeInstanceOf(zlib.Inflate)
      expect(Client.createDecompressor('foo')).toBeUndefined()
    })
  })

  describe('#transformFactory', () => {
    it('should create a transform function', () => {
      const data = 'foo'
      expect(Client.transformFactory('text')(data)).toBe(data)
      expect(Client.transformFactory('json')(JSON.stringify(data))).toBe(data)
      const buffer = Client.transformFactory(false)(data)
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.toString('utf8')).toBe(data)
    })
  })

  describe('isRequestTimeoutAbort', () => {
    it('should return false when timeoutSignal is undefined', () => {
      expect(isRequestTimeoutAbort(new Error('boom'), undefined)).toBe(false)
    })

    it('should return false when timeout has not fired (reason is undefined)', () => {
      const signal = AbortSignal.timeout(60_000)
      expect(signal.reason).toBeUndefined()
      expect(isRequestTimeoutAbort(new Error('boom'), signal)).toBe(false)
    })

    it('should return false when reason is not a TimeoutError (e.g. caller AbortError)', () => {
      const controller = new AbortController()
      controller.abort()
      expect(controller.signal.reason).toBeDefined()
      expect(controller.signal.reason.name).not.toBe('TimeoutError')
      expect(isRequestTimeoutAbort(new Error('boom'), controller.signal)).toBe(false)
    })

    it('should return true when err is the timeout reason itself (direct case)', async () => {
      const signal = AbortSignal.timeout(1)
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(signal.reason?.name).toBe('TimeoutError')
      expect(isRequestTimeoutAbort(signal.reason, signal)).toBe(true)
    })

    it('should return true when err wraps the timeout reason as cause (ABORT_ERR case)', async () => {
      const signal = AbortSignal.timeout(1)
      await new Promise(resolve => setTimeout(resolve, 5))
      const wrapped = new Error('The operation was aborted')
      wrapped.name = 'AbortError'
      wrapped.code = 'ABORT_ERR'
      wrapped.cause = signal.reason
      expect(isRequestTimeoutAbort(wrapped, signal)).toBe(true)
    })

    it('should return false when err has ABORT_ERR code but cause is a different reason', async () => {
      const signal = AbortSignal.timeout(1)
      await new Promise(resolve => setTimeout(resolve, 5))
      const otherReason = new DOMException('other', 'TimeoutError')
      const wrapped = new Error('The operation was aborted')
      wrapped.name = 'AbortError'
      wrapped.code = 'ABORT_ERR'
      wrapped.cause = otherReason
      expect(isRequestTimeoutAbort(wrapped, signal)).toBe(false)
    })

    it('should return false for unrelated errors when timeout has fired', async () => {
      const signal = AbortSignal.timeout(1)
      await new Promise(resolve => setTimeout(resolve, 5))
      const networkErr = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })
      expect(isRequestTimeoutAbort(networkErr, signal)).toBe(false)
    })
  })

  describe('mapTimeoutAbortError', () => {
    const requestOptions = { method: 'GET', url: new URL('https://example.org/foo/bar') }

    it('should rewrite a timeout-triggered error as TimeoutError with descriptive message', async () => {
      const signal = AbortSignal.timeout(1)
      await new Promise(resolve => setTimeout(resolve, 5))
      const wrapped = Object.assign(new Error('The operation was aborted'), {
        name: 'AbortError',
        code: 'ABORT_ERR',
        cause: signal.reason,
      })
      const mapped = mapTimeoutAbortError(wrapped, requestOptions, 1, signal)
      expect(mapped).toMatchObject({
        name: 'TimeoutError',
        message: 'Request exceeded 1 ms for GET /foo/bar',
      })
      expect(mapped.cause).toBe(wrapped)
    })

    it('should pass through caller AbortError unchanged', () => {
      const controller = new AbortController()
      controller.abort()
      const timeoutSignal = AbortSignal.timeout(60_000)
      const callerErr = Object.assign(new Error('aborted'), {
        name: 'AbortError',
        code: 'ABORT_ERR',
        cause: controller.signal.reason,
      })
      expect(mapTimeoutAbortError(callerErr, requestOptions, 60_000, timeoutSignal)).toBe(callerErr)
    })

    it('should pass through unrelated errors unchanged', () => {
      const timeoutSignal = AbortSignal.timeout(60_000)
      const err = new Error('boom')
      expect(mapTimeoutAbortError(err, requestOptions, 60_000, timeoutSignal)).toBe(err)
    })
  })
})
