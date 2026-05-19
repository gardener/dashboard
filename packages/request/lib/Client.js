//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { join } from 'path'
import { isIP } from 'net'
import http from 'http'
import http2 from 'http2'
import zlib from 'zlib'
import typeis from 'type-is/index.js'
import { pick, omit } from 'lodash-es'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import { createHttpError, ParseError, TimeoutError } from './errors.js'
import agent from './Agent.js'
import { pipeline } from 'stream'

const { globalAgent } = agent

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
  HTTP2_HEADER_CONTENT_ENCODING,
} = http2.constants

function getHeader (headers, key) {
  return headers[key] // eslint-disable-line security/detect-object-injection
}

function setHeader (headers, key, value) {
  headers[key] = value // eslint-disable-line security/detect-object-injection
}

const EOL = '\n'
const MAX_TIMEOUT = 2_147_483_647 // Node.js TIMEOUT_MAX (2^31 - 1)

function combineSignals (a, b) {
  if (!a) {
    return b
  }
  if (!b) {
    return a
  }
  return AbortSignal.any([a, b])
}

function createTimeoutSignal (requestTimeout) {
  if (requestTimeout === 0) {
    return undefined
  }
  if (
    !Number.isInteger(requestTimeout) ||
    requestTimeout < 0 ||
    requestTimeout > MAX_TIMEOUT
  ) {
    throw new TypeError(`requestTimeout must be a non-negative integer <= ${MAX_TIMEOUT}`)
  }
  return AbortSignal.timeout(requestTimeout)
}

/**
 * Detects whether an error originated from our requestTimeout firing,
 * as opposed to a caller-supplied abort or unrelated failure.
 *
 * Used by mapTimeoutAbortError to decide whether to rewrite the error
 * as a domain-level TimeoutError. Caller aborts stay as AbortError so
 * consumers can distinguish "I cancelled" from "server too slow".
 */
function isRequestTimeoutAbort (err, timeoutSignal) {
  // AbortSignal.timeout() sets signal.reason to a TimeoutError DOMException
  // only after firing. Undefined reason or non-TimeoutError name means our
  // timeout never triggered — the error must be from something else.
  const reason = timeoutSignal?.reason
  if (!reason || reason.name !== 'TimeoutError') {
    return false
  }

  // Node delivers timeout-triggered aborts in two shapes depending on which
  // await throws (stream creation vs getHeaders vs body read):
  //   1. The promise rejects with signal.reason directly.
  //   2. Node wraps it in an AbortError with code 'ABORT_ERR' and cause=reason.
  // Match both forms.
  return err === reason ||
    (err?.code === 'ABORT_ERR' && err.cause === reason)
}

function mapTimeoutAbortError (err, { method, url } = {}, requestTimeout, timeoutSignal) {
  if (isRequestTimeoutAbort(err, timeoutSignal)) {
    return new TimeoutError(
      `Request exceeded ${requestTimeout} ms for ${method} ${url?.pathname ?? ''}`,
      { cause: err },
    )
  }
  return err
}

class Client {
  #options
  #agent

  constructor (options = {}) {
    if (!options.url) {
      throw TypeError('url is required')
    }
    this.#agent = options.agent || globalAgent
    this.#options = options
  }

  get defaults () {
    return { options: omit(this.#options, ['agent']) }
  }

  get baseUrl () {
    const { url, relativeUrl } = this.#options
    return relativeUrl
      ? new URL(relativeUrl, url.endsWith('/') ? url : url + '/')
      : new URL(url)
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
      setHeader(headers, HTTP2_HEADER_AUTHORIZATION, `Bearer ${bearer}`)
    } else if (user && pass) {
      const credentials = Buffer.from(user + ':' + pass, 'utf8').toString('base64')
      setHeader(headers, HTTP2_HEADER_AUTHORIZATION, `Basic ${credentials}`)
    }
    return headers
  }

  get #defaultOptions () {
    const { hostname } = new URL(this.baseUrl)
    // use empty string '' to disable sending the SNI extension
    const servername = isIP(hostname) !== 0 ? '' : hostname
    const keys = [
      'ca',
      'rejectUnauthorized',
      'key',
      'cert',
      'servername',
      'id',
      'keepAliveTimeout',
      'connectTimeout',
      'pingInterval',
      'maxOutstandingPings',
      'maxSessionMemory',
      'maxHeaderListPairs',
      'maxReservedRemoteStreams',
      'peerMaxConcurrentStreams',
      'settings',
    ]
    return {
      servername,
      ...pick(this.#options, keys),
    }
  }

  get #hooksMap () {
    const hooks = this.#options.hooks ?? {}
    return new Map(Object.entries(hooks))
  }

  executeHooks (name, ...args) {
    try {
      const hooks = this.#hooksMap.get(name)
      if (Array.isArray(hooks)) {
        for (const hook of hooks) {
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
        [HTTP2_HEADER_ACCEPT_ENCODING]: 'gzip, deflate, br',
      },
      normalizeHeaders(this.#defaultHeaders),
      normalizeHeaders(headers),
    )
  }

  async fetch (path, {
    method,
    searchParams,
    headers,
    body,
    responseType = this.responseType,
    signal,
    requestTimeout = this.#options.requestTimeout ?? 60 * 1000,
    ...options
  } = {}) {
    headers = this.getRequestHeaders(path, {
      method,
      searchParams,
      headers,
    })

    // beforeRequest hooks
    const requestOptions = {
      url: new URL(getHeader(headers, HTTP2_HEADER_PATH), this.baseUrl.origin),
      method: getHeader(headers, HTTP2_HEADER_METHOD),
      headers,
      body,
      ...options,
    }
    this.executeHooks('beforeRequest', requestOptions)

    const timeoutSignal = createTimeoutSignal(requestTimeout)
    const effectiveSignal = combineSignals(signal, timeoutSignal)
    const mapError = err => mapTimeoutAbortError(err, requestOptions, requestTimeout, timeoutSignal)

    try {
      const stream = await this.#agent.request(headers, {
        ...this.#defaultOptions,
        ...options,
        signal: effectiveSignal,
      })
      if (body) {
        stream.write(body)
      }
      stream.end()

      const { createDecompressor, concat, transformFactory } = this.constructor

      headers = await stream.getHeaders()
      const decompressor = createDecompressor(getHeader(headers, HTTP2_HEADER_CONTENT_ENCODING))

      return {
        request: { options: requestOptions },
        headers,
        get statusCode () {
          return getHeader(this.headers, HTTP2_HEADER_STATUS)
        },
        get ok () {
          return this.statusCode >= 200 && this.statusCode < 300
        },
        get redirected () {
          return this.statusCode >= 300 && this.statusCode < 400
        },
        get contentType () {
          return getHeader(this.headers, HTTP2_HEADER_CONTENT_TYPE)
        },
        get contentLength () {
          return getHeader(this.headers, HTTP2_HEADER_CONTENT_LENGTH)
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
              const text = await concat(source)
              switch (this.type) {
                case 'text':
                  return text
                case 'json':
                  try {
                    return JSON.parse(text)
                  } catch (err) {
                    logger.error('Failed to parse response body: %s', text)
                    if (this.ok) {
                      throw new ParseError(err.message, {
                        headers,
                        rawBody: text,
                      })
                    }
                    // return the raw body text if the response status is not ok (keep the original http error in this case)
                    return text
                  }
                default:
                  return Buffer.from(text, 'utf8')
              }
            },
          ]
          if (decompressor) {
            streams.splice(1, 0, decompressor)
          }
          return new Promise((resolve, reject) => {
            pipeline(streams, (err, body) => {
              if (err) {
                reject(mapError(err))
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
          try {
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
          } catch (err) {
            throw mapError(err)
          }
        },
      }
    } catch (err) {
      throw mapError(err)
    }
  }

  async stream (path, options) {
    const response = await this.fetch(path, { requestTimeout: 0, ...options })
    const statusCode = response.statusCode
    if (statusCode >= 400) {
      throw createHttpError({
        statusCode,
        headers: response.headers,
        body: await response.body(),
      })
    }
    return response
  }

  async request (path, { headers = {}, body, json, onWarning, ...options } = {}) {
    headers = this.constructor.normalizeHeaders(headers)
    if (json) {
      body = JSON.stringify(json)
      if (!getHeader(headers, HTTP2_HEADER_CONTENT_TYPE)) {
        setHeader(headers, HTTP2_HEADER_CONTENT_TYPE, 'application/json')
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
      statusMessage: http.STATUS_CODES[statusCode], // eslint-disable-line security/detect-object-injection
      body,
      request: response.request,
    }
    this.executeHooks('afterResponse', responseOptions)

    if (typeof onWarning === 'function' && response.headers.warning) {
      onWarning.call(response, response.headers.warning)
    }

    if (statusCode >= 400) {
      throw createHttpError({
        statusCode,
        headers,
        body,
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

export default Client
export { isRequestTimeoutAbort, mapTimeoutAbortError }
