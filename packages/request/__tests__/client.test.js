//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http2 = require('http2')
const zlib = require('zlib')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const { Client, extend } = require('../lib')
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
  HTTP2_HEADER_STATUS
} = http2.constants

jest.useFakeTimers('legacy')

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
    stream = {
      close: jest.fn(),
      destroy: jest.fn(),
      end: jest.fn(),
      once: jest.fn(),
      mockBody: jest.fn().mockReturnValue({
        foo: 'bar',
        bar: 'foo'
      }),
      mockHeaders: jest.fn().mockReturnValue({
        [HTTP2_HEADER_STATUS]: statusCode,
        [HTTP2_HEADER_CONTENT_TYPE]: contentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: contentLength
      }),
      async getHeaders () {
        return this.mockHeaders()
      },
      setEncoding: jest.fn(),
      async * [Symbol.asyncIterator] () {
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
    }
    agent = {
      request: jest.fn().mockResolvedValue(stream)
    }
    client = new Client({
      url,
      agent,
      headers: {
        'X-Request-Id': xRequestId
      }
    })
  })

  describe('#constructor', () => {
    it('should create a new object', () => {
      expect(client).toBeInstanceOf(Client)
      expect(client.baseUrl.href).toBe(url.href)
      expect(client.responseTimeout).toBe(15000)
    })

    it('should throw a type error', () => {
      expect(() => new Client()).toThrowError(TypeError)
    })

    it('should create an instance with url and relativeUrl', () => {
      client = new Client({
        url: url.origin,
        relativeUrl: url.pathname
      })
      expect(client.baseUrl.href).toBe(url.href)
    })

    it('should create an instance with bearer authorization', () => {
      client = new Client({
        url,
        auth: {
          bearer: 'token'
        }
      })
      const headers = client.getRequestHeaders()
      expect(headers[HTTP2_HEADER_AUTHORIZATION]).toBe('Bearer token')
    })

    it('should create an instance with basic authorization', () => {
      client = new Client({
        url,
        auth: {
          user: 'a',
          pass: 'b'
        }
      })
      const headers = client.getRequestHeaders()
      expect(headers[HTTP2_HEADER_AUTHORIZATION]).toBe('Basic YTpi')
    })
  })

  describe('#executeHooks', () => {
    const message = 'Hook execution failed'

    it('should run all hooks', () => {
      const beforeRequestSpy = jest.fn()
      const afterResponseSpy = jest.fn(() => {
        throw new Error(message)
      })
      const client = new Client({
        url,
        hooks: {
          beforeRequest: [beforeRequestSpy],
          afterResponse: [afterResponseSpy]
        }
      })
      const args = ['a', 2, true]
      client.executeHooks('beforeRequest', ...args)
      expect(beforeRequestSpy).toBeCalledTimes(1)
      expect(beforeRequestSpy.mock.calls[0]).toEqual(args)
      expect(afterResponseSpy).not.toBeCalled()
      client.executeHooks('afterResponse')
      expect(afterResponseSpy).toBeCalledTimes(1)
      expect(logger.error).toBeCalledTimes(1)
      expect(logger.error).lastCalledWith('Failed to execute "afterResponse" hooks', message)
    })
  })

  describe('#getRequestHeaders', () => {
    const defaultRequestHeaders = {
      [HTTP2_HEADER_SCHEME]: 'https',
      [HTTP2_HEADER_AUTHORITY]: '127.0.0.1:31415',
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/test',
      [HTTP2_HEADER_ACCEPT_ENCODING]: 'gzip, deflate, br',
      'x-request-id': xRequestId
    }

    it('should return request header defaults', () => {
      expect(client.getRequestHeaders()).toEqual({
        ...defaultRequestHeaders
      })
    })

    it('should return request headers with absolute path', () => {
      expect(client.getRequestHeaders('/absolute/path')).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/absolute/path'
      })
    })

    it('should return request headers with relative path', () => {
      expect(client.getRequestHeaders('relative/path')).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/test/relative/path'
      })
    })

    it('should return request headers with search params', () => {
      const searchParams = new URLSearchParams({ foo: 'bar' })
      const search = '?' + searchParams
      expect(client.getRequestHeaders('path', {
        method: 'post',
        searchParams
      })).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/test/path' + search
      })
    })

    it('should return request headers with query params', () => {
      const query = { foo: 'bar' }
      const search = '?' + new URLSearchParams(query)
      expect(client.getRequestHeaders('path', {
        searchParams: { foo: 'bar' }
      })).toEqual({
        ...defaultRequestHeaders,
        [HTTP2_HEADER_PATH]: '/test/path' + search
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
        redirected: false
      })
      const body = await response.body()
      expect(body).toEqual(stream.mockBody())
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
      expect(stream.destroy).toBeCalledTimes(1)
      expect(stream.destroy.mock.calls[0]).toEqual([error])
    })
  })

  describe('#stream', () => {
    it('should successfully return a response', async () => {
      const statusCode = 200
      const response = {
        statusCode
      }
      client.fetch = jest.fn().mockResolvedValue(response)
      await expect(client.stream()).resolves.toBe(response)
    })

    it('should throw a NotFound error', async () => {
      const statusCode = 404
      const headers = {
        [HTTP2_HEADER_STATUS]: statusCode
      }
      const body = 'body'
      const response = {
        headers,
        statusCode,
        body: jest.fn().mockResolvedValue(body)
      }
      client.fetch = jest.fn().mockResolvedValue(response)
      await expect(client.stream()).rejects.toEqual(expect.objectContaining({
        name: 'NotFoundError',
        headers,
        statusCode,
        body
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
})
