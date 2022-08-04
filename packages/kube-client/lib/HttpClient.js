//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const request = require('@gardener-dashboard/request')
const createError = require('http-errors')
const { http } = require('./symbols')

class HttpClient {
  constructor (options) {
    this[http.client] = request.extend(options)
  }

  [http.request] (url, { searchParams, ...options } = {}) {
    if (searchParams && searchParams.toString()) {
      options.searchParams = searchParams
    }
    return this[http.client].request(url, options)
  }

  async [http.stream] (url, { ...options } = {}) {
    const response = await this[http.client].stream(url, options)
    this.constructor.extendResponse(response)
    return response
  }

  static get [http.relativeUrl] () {
    return '/'
  }

  static extendResponse (response) {
    const { names: { plural } = {} } = this
    const createTimeoutError = timeout => {
      const forResource = plural ? ` for "${plural}"` : ''
      return createError(504, `The condition${forResource} was not met within ${timeout} ms`)
    }

    response.until = async (condition, { timeout = 60000 } = {}) => {
      let timeoutId
      if (timeout > 0 && timeout < Infinity) {
        timeoutId = setTimeout(() => response.destroy(createTimeoutError(timeout)), timeout)
      }
      try {
        for await (const event of response) {
          let ok = condition(event)
          let object
          [ok, object] = Array.isArray(ok) ? ok : [ok, event.object]
          if (ok) {
            return object
          }
        }
        // If the response stream ends even though the condition has not yet been met,
        // also in this case a timeout error is thrown.
        throw createTimeoutError(timeout)
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }
}

module.exports = HttpClient
