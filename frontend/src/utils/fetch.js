//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createError, { isHttpError } from 'http-errors'

const interceptors = []

const registry = {
  register (interceptor) {
    interceptors.unshift(interceptor)
    return () => {
      const index = interceptors.indexOf(interceptor)
      if (index !== -1) {
        interceptors.splice(index, 1)
      }
    }
  },
  clear () {
    interceptors.splice(0, interceptors.length)
  }
}

function fetchInterceptor (url, { method = 'GET', cache = 'no-cache', headers, body, ...options } = {}) {
  headers = {
    accept: 'application/json, text/*;q=0.9, */*;q=0.8',
    'x-requested-with': 'XMLHttpRequest',
    ...headers
  }
  if (body) {
    if (typeof body === 'object') {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(body)
    }
    options.body = body
  }
  const request = new Request(url, { method, cache, headers, ...options })
  let promise = fetch(request).then(fulfilledFn(request), rejectedFn(request))
  for (const { response, error } of interceptors) {
    if (response || error) {
      promise = promise.then(response, error)
    }
  }
  return promise
}

function rejectedFn (request) {
  return error => {
    Object.defineProperty(error, 'request', {
      value: request
    })
    return Promise.reject(error)
  }
}

function fulfilledFn (request) {
  return response => {
    Object.defineProperties(response, {
      request: {
        value: request
      },
      headerMap: {
        value: response.headers
      },
      headers: {
        get () {
          return Object.fromEntries(this.headerMap)
        }
      }
    })

    let promise = Promise.resolve(response)

    const contentType = response.headers['content-type']
    if (contentType) {
      const method = contentType.startsWith('application/json')
        ? 'json'
        : 'text'
      promise = response[method]().then(data => {
        Object.defineProperty(response, 'data', {
          value: data
        })
        return response
      })
    }

    const status = response.status
    if (status >= 200 && status < 300) {
      return promise
    }

    let error
    if (status < 400) {
      const responseType = status < 300
        ? 'informational'
        : 'redirection'
      error = new TypeError(`Unexpected ${responseType} response with status code ${status}`)
    } else {
      const message = status === 401
        ? 'Authentication failed'
        : `Request failed with status code ${status}`
      error = createError(status, message, { response })
    }

    return Promise.reject(error)
  }
}

export { fetchInterceptor as default, registry, isHttpError }
