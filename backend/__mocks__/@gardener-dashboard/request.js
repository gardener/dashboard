//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mapKeys, toLower } = require('lodash')
const { join } = require('path')
const createError = require('http-errors')

const request = jest.requireActual('@gardener-dashboard/request')

const mockRequest = jest.fn(() => Promise.reject(createError(503, 'Service Unavailable')))

const defaults = Symbol('defaults')
const pseudoHeaders = Symbol('headers')

class MockClient {
  constructor ({ prefixUrl, ...options }) {
    const { protocol, host, pathname = '/' } = new URL(prefixUrl)
    this[pseudoHeaders] = {
      ':scheme': protocol.replace(/:$/, ''),
      ':authority': host,
      ':path': pathname
    }
    this[defaults] = {
      options: {
        prefixUrl,
        ...options
      }
    }
  }

  get pseudoHeaders () {
    return this[pseudoHeaders]
  }

  get defaults () {
    return this[defaults]
  }

  request (path, { method = 'get', searchParams, headers = {}, json, body } = {}) {
    headers = {
      ...this.defaults.options.headers,
      ...mapKeys(headers, (value, key) => toLower(key)),
      ':method': method,
      ...this[pseudoHeaders]
    }

    headers[':path'] = join(headers[':path'], path)
    if (searchParams) {
      headers[':path'] += '?' + searchParams
    }
    if (json) {
      return mockRequest(headers, json)
    }
    if (body) {
      return mockRequest(headers, body)
    }
    return mockRequest(headers)
  }
}

module.exports = {
  ...request,
  extend: jest.fn(options => new MockClient(options)),
  mockRequest
}
