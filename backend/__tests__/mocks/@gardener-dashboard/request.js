//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import {
  mapKeys,
  toLower,
  omit,
} from 'lodash-es'
import { join } from 'path'
import http2 from 'http2'
import createError from 'http-errors'

const { default: request } = await vi.importActual('@gardener-dashboard/request')

const mockRequest = vi.fn(() => Promise.reject(createError(503, 'Service Unavailable')))
const {
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORIZATION,
} = http2.constants

class MockClient {
  #options

  constructor (options) {
    this.#options = options
  }

  get baseUrl () {
    const { url, relativeUrl } = this.#options
    return relativeUrl
      ? new URL(relativeUrl, url)
      : new URL(url)
  }

  get defaults () {
    return { options: omit(this.#options, ['agent']) }
  }

  stream (path, options) {
    return this.request(path, options)
  }

  request (path, { method = 'get', searchParams, headers = {}, json, body } = {}) {
    const { protocol, host, pathname = '/' } = this.baseUrl
    headers = {
      ...this.defaults.options.headers,
      ...mapKeys(headers, (_, key) => toLower(key)),
      [HTTP2_HEADER_METHOD]: method,
      [HTTP2_HEADER_SCHEME]: protocol.replace(/:$/, ''),
      [HTTP2_HEADER_AUTHORITY]: host,
      [HTTP2_HEADER_PATH]: pathname,
    }
    headers[HTTP2_HEADER_PATH] = join(headers[HTTP2_HEADER_PATH], path)
    if (searchParams) {
      headers[HTTP2_HEADER_PATH] += '?' + searchParams
    }
    const auth = this.defaults.options.auth
    if (auth && auth.bearer) {
      headers[HTTP2_HEADER_AUTHORIZATION] = `Bearer ${auth.bearer}`
    }
    const args = [headers]
    if (json) {
      args.push(json)
    } else if (body) {
      args.push(body)
    }
    return mockRequest(...args)
  }
}

const mockModule = {
  ...request,
  extend: vi.fn(options => new MockClient(options)),
  mockRequest,
}

export default mockModule
export const { extend, createHttpError, isHttpError } = mockModule
export { mockRequest }
