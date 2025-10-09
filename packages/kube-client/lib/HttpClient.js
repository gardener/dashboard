//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import request from '@gardener-dashboard/request'
import createError from 'http-errors'
import { http } from './symbols.js'

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
    const createTimeoutError = (timeout, reason) => {
      const forResource = plural ? ` for "${plural}"` : ''
      let message = `The condition${forResource} was not met within ${timeout} ms`
      if (reason) {
        message += `: ${reason}`
      }
      return createError(504, message)
    }

    response.until = async (condition, { timeout = 60000 } = {}) => {
      let timeoutId
      let timeoutReason
      if (timeout > 0 && timeout < Infinity) {
        timeoutId = setTimeout(() => response.destroy(createTimeoutError(timeout, timeoutReason)), timeout)
      }
      try {
        for await (const event of response) {
          const {
            ok,
            reason,
            object = event.object,
          } = condition(event)
          if (ok) {
            return object
          }

          timeoutReason = reason
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

export default HttpClient
