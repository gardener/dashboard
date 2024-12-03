//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const interceptors = []

export const registry = {
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
    interceptors.splice(0, this.size)
  },
  get size () {
    return interceptors.length
  },
}

export function fetchWrapper (url, { method = 'GET', cache = 'no-cache', headers, body, ...options } = {}) {
  let promise = new Promise(resolve => {
    headers = {
      accept: 'application/json, text/*;q=0.9, */*;q=0.8',
      'x-requested-with': 'XMLHttpRequest',
      ...headers,
    }
    if (body) {
      if (typeof body === 'object') {
        headers['content-type'] = 'application/json; charset=UTF-8'
        body = JSON.stringify(body)
      }
      options.body = body
    }
    resolve([url, { method, cache, headers, ...options }])
  })
  for (const { requestFulfilled, requestRejected } of interceptors) {
    if (requestFulfilled || requestRejected) {
      promise = promise.then(args => requestFulfilled(...args), requestRejected)
    }
  }
  promise = promise.then(args => {
    try {
      new URL(args[0]) // eslint-disable-line no-new
    } catch (err) {
      args[0] = new URL(args[0], window.location.origin)
    }
    const request = new Request(...args)
    return fetch(request).then(fulfilledFn(request), rejectedFn(request))
  })
  for (const { responseFulfilled, responseRejected } of interceptors) {
    if (responseFulfilled || responseRejected) {
      promise = promise.then(responseFulfilled, responseRejected)
    }
  }
  return promise
}

function rejectedFn (request) {
  return error => {
    Object.defineProperty(error, 'request', {
      value: request,
    })
    return Promise.reject(error)
  }
}

function fulfilledFn (request) {
  return response => {
    Object.defineProperties(response, {
      request: {
        value: request,
      },
      headerMap: {
        value: response.headers,
      },
      headers: {
        get () {
          return Object.fromEntries(this.headerMap)
        },
      },
    })

    let promise
    const contentType = response.headers['content-type']
    if (!contentType) {
      promise = Promise.resolve(response)
    } else {
      promise = contentType.startsWith('application/json')
        ? response.json()
        : response.text()
      promise = promise.then(data => {
        Object.defineProperty(response, 'data', {
          value: data,
        })
        return response
      })
    }

    const status = response.status
    if (status >= 200 && status < 300) {
      return promise
    }

    return promise.then(response => {
      if (status < 400) {
        const responseType = status < 300
          ? 'informational'
          : 'redirection'
        throw new TypeError(`Unexpected ${responseType} response with status code ${status}`)
      } else {
        const message = status === 401
          ? 'Authentication failed'
          : `Request failed with status code ${status}`
        throw createError(status, message, { response })
      }
    })
  }
}

export function isUnauthorizedError (err) {
  return err.name === 'FetchError' && err.statusCode === 401
}

export function createError (status, message, properties = {}) {
  const err = new Error(message)
  err.name = 'FetchError'
  err.status = err.statusCode = status
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(err, key, {
      value,
      enumerable: true,
    })
  }
  return err
}
