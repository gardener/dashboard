//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { join } = require('path')
const { isIP } = require('net')
const http = require('http')
const http2 = require('http2')
const zlib = require('zlib')
const typeis = require('type-is')
const { pick, omit } = require('lodash')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const { createHttpError } = require('./errors')
const { globalAgent } = require('./Agent')
const { pipeline } = require('stream')

const {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_AUTHORIZATION,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_METHOD_GET,
  HTTP2_HEADER_ACCEPT_ENCODING,
  HTTP2_HEADER_CONTENT_ENCODING
} = http2.constants

const EOL = '\n'

class Client {
  #options
  #agent

  constructor (options = {}) {
    if (!options.url && !options.prefixUrl) {
      throw TypeError('url or prefixUrl is required')
    }
    this.#agent = options.agent || globalAgent
    this.#options = options
  }

  get defaults () {
    return { options: omit(this.#options, ['agent']) }
  }

  get baseUrl () {
    const url = this.#options.url || this.#options.prefixUrl
    return this.#options.relativeUrl
      ? new URL(this.#options.relativeUrl, url)
      : new URL(url)
  }

  get responseTimeout () {
    return this.#options.responseTimeout || 15 * 1000
  }

  get responseType () {
    return this.#options.responseType
  }

  set responseType (value) {
    this.#options.responseType = value
  }

  get #defaultHeaders () {
    const headers = { ...this.#options.headers }
    const { bearer, user, pass } = this.#options.auth || {}
    if (bearer) {
      headers[HTTP2_HEADER_AUTHORIZATION] = `Bearer ${bearer}`
    } else if (user && pass) {
      const credentials = Buffer.from(user + ':' + pass, 'utf8').toString('base64')
      headers[HTTP2_HEADER_AUTHORIZATION] = `Basic ${credentials}`
    }
    return headers
  }

  get #defaultOptions () {
    const { hostname } = new URL(this.baseUrl)
    // use empty string '' to disable sending the SNI extension
    const servername = isIP(hostname) !== 0 ? '' : hostname
    return {
      servername,
      ...pick(this.#options, ['ca', 'rejectUnauthorized', 'key', 'cert', 'servername', 'id'])
    }
  }

  executeHooks (name, ...args) {
    const hooks = this.#options.hooks || {}
    try {
      if (Array.isArray(hooks[name])) {
        for (const hook of hooks[name]) {
          hook(...args)
        }
      }
    } catch (err) {
      logger.error(`Failed to execute "${name}" hooks`, err.message)
    }
  }

  getRequestHeaders (path = '', { method = HTTP2_METHOD_GET, searchParams, headers } = {}) {
    const url = this.baseUrl
    const [pathname, search = ''] = path.split(/\?/)
    if (pathname.startsWith('/')) {
      url.pathname = pathname
    } else {
      url.pathname = join(url.pathname, pathname)
    }
    if (!searchParams) {
      url.search = search
    } else if (searchParams instanceof URLSearchParams) {
      url.search = searchParams.toString()
    } else {
      url.search = new URLSearchParams(searchParams).toString()
    }
    const { normalizeHeaders } = this.constructor
    return Object.assign(
      {
        [HTTP2_HEADER_SCHEME]: url.protocol.replace(/:$/, ''),
        [HTTP2_HEADER_AUTHORITY]: url.host,
        [HTTP2_HEADER_METHOD]: method.toUpperCase(),
        [HTTP2_HEADER_PATH]: url.pathname + url.search,
        [HTTP2_HEADER_ACCEPT_ENCODING]: 'gzip, deflate, br'
      },
      normalizeHeaders(this.#defaultHeaders),
      normalizeHeaders(headers)
    )
  }

  async fetch (path, { method, searchParams, headers, body, signal, ...options } = {}) {
    headers = this.getRequestHeaders(path, {
      method,
      searchParams,
      headers
    })

    // beforeRequest hooks
    const requestOptions = {
      url: new URL(headers[HTTP2_HEADER_PATH], this.baseUrl.origin),
      method: headers[HTTP2_HEADER_METHOD],
      headers,
      body,
      ...options
    }
    this.executeHooks('beforeRequest', requestOptions)

    const stream = await this.#agent.request(headers, {
      ...this.#defaultOptions,
      ...options,
      signal
    })
    if (body) {
      stream.write(body)
    }
    stream.end()

    const responseType = this.responseType
    const { createDecompressor, concat, transformFactory } = this.constructor

    headers = await stream.getHeaders()
    const decompressor = createDecompressor(headers[HTTP2_HEADER_CONTENT_ENCODING])

    return {
      request: { options: requestOptions },
      headers,
      get statusCode () {
        return this.headers[HTTP2_HEADER_STATUS]
      },
      get ok () {
        return this.statusCode >= 200 && this.statusCode < 300
      },
      get redirected () {
        return this.statusCode >= 300 && this.statusCode < 400
      },
      get contentType () {
        return this.headers[HTTP2_HEADER_CONTENT_TYPE]
      },
      get contentLength () {
        return this.headers[HTTP2_HEADER_CONTENT_LENGTH]
      },
      get type () {
        if (['json', 'text'].includes(responseType)) {
          return responseType
        }
        return typeis.is(this.contentType, ['json', 'text'])
      },
      destroy (error) {
        stream.destroy(error)
      },
      body () {
        const streams = [
          stream,
          async source => {
            switch (this.type) {
              case 'text':
                return concat(source)
              case 'json':
                return JSON.parse(await concat(source))
              default:
                return Buffer.from(concat(source), 'utf8')
            }
          }
        ]
        if (decompressor) {
          streams.splice(1, 0, decompressor)
        }
        return new Promise((resolve, reject) => {
          pipeline(streams, (err, body) => {
            if (err) {
              reject(err)
            } else {
              resolve(body)
            }
          })
        })
      },
      async * [Symbol.asyncIterator] () {
        let data = ''
        const transform = transformFactory(this.type)
        let readable = stream
        if (decompressor) {
          readable = pipeline(stream, decompressor, err => {
            if (err) {
              logger.debug('Stream decompress pipeline error: %s', err.message)
            }
          })
        }
        readable.setEncoding('utf8')
        for await (const chunk of readable) {
          data += chunk
          let index
          while ((index = data.indexOf(EOL)) !== -1) {
            yield transform(data.slice(0, index))
            data = data.slice(index + 1)
          }
        }
        if (data && data.length) {
          yield transform(data)
        }
      }
    }
  }

  async stream (path, options) {
    const response = await this.fetch(path, options)
    const statusCode = response.statusCode
    if (statusCode >= 400) {
      throw createHttpError({
        statusCode,
        headers: response.headers,
        body: await response.body()
      })
    }
    return response
  }

  async request (path, { headers = {}, body, json, ...options } = {}) {
    headers = this.constructor.normalizeHeaders(headers)
    if (json) {
      body = JSON.stringify(json)
      if (!headers[HTTP2_HEADER_CONTENT_TYPE]) {
        headers[HTTP2_HEADER_CONTENT_TYPE] = 'application/json'
      }
    }
    const response = await this.fetch(path, { headers, body, ...options })
    const statusCode = response.statusCode
    headers = response.headers
    body = await response.body()

    // afterResponse hooks
    const responseOptions = {
      headers,
      httpVersion: '2',
      statusCode,
      statusMessage: http.STATUS_CODES[statusCode],
      body,
      request: response.request
    }
    this.executeHooks('afterResponse', responseOptions)

    if (statusCode >= 400) {
      throw createHttpError({
        statusCode,
        headers,
        body
      })
    }
    return body
  }

  static normalizeHeaders (headers = {}) {
    const normalizeHeaders = {}
    for (const [key, value] of Object.entries(headers)) {
      normalizeHeaders[key.toLowerCase()] = value
    }
    return normalizeHeaders
  }

  static transformFactory (type) {
    switch (type) {
      case 'text':
        return data => data
      case 'json':
        return data => {
          try {
            return JSON.parse(data)
          } catch (err) {
            return err
          }
        }
      default:
        return data => Buffer.from(data, 'utf8')
    }
  }

  static async concat (source) {
    let data = ''
    source.setEncoding('utf8')
    for await (const chunk of source) {
      data += chunk
    }
    return data
  }

  static createDecompressor (contentEncoding) {
    switch (contentEncoding) {
      case 'br':
        return zlib.createBrotliDecompress()
      case 'gzip':
        return zlib.createGunzip()
      case 'deflate':
        return zlib.createInflate()
    }
  }

  static extend (options) {
    return new Client(options)
  }
}

module.exports = Client
