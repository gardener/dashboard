//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import decode from 'jwt-decode'
import get from 'lodash/get'
import { createError, isUnauthorizedError } from './fetch'

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'

function createNoUserError (message = 'User not found') {
  const error = new Error('User not found')
  error.name = 'NoUserError'
  return error
}

function createUnauthorizedError (message) {
  const error = new Error(message)
  error.name = 'UnauthorizedError'
  return error
}

function now () {
  return Math.floor(Date.now() / 1000)
}

function secondsUntil (val) {
  if (val) {
    const t = Number(val)
    if (!Number.isNaN(t)) {
      return t - now()
    }
  }
}

function isRefreshRequired (user, tolerance = 15) {
  const t = secondsUntil(user?.refresh_at)
  return typeof t === 'number' && t < tolerance
}

function isSessionExpired (user, tolerance = 1) {
  const t = secondsUntil(user?.exp)
  return typeof t === 'number' && t < tolerance
}

function createTokenRefreshRequest () {
  return fetch('/auth/token', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ time: Date.now() })
  })
    .then(response => {
      return response.json()
        .then(data => Object.assign(response, 'data', { value: data }), () => { /* ignore error */ })
        .then(() => response)
    })
    .then(response => {
      if (response.status >= 400) {
        throw createError(response.status, 'Token refresh failed', { response })
      }
    })
    .catch(err => {
      if (isUnauthorizedError(err)) {
        let message = get(err, 'response.data.message')
        if (message) {
        /*
         * The OPError message has the following format `${error} (${error_description})`
         * (see https://github.com/panva/node-openid-client/blob/main/lib/errors.js#L5)
         * The error and the error_description are values returned in the error response
         * from the the OpenID Connect Provider (OP). We use the original OP error_description
         * as error message if possible.
         */
          const matches = /^(.+) \((.+)\)$/.exec(message)
          if (matches && matches.length > 2) {
            message = matches[2]
          }
        } else {
          message = err.message
        }
        throw createUnauthorizedError(message)
      }
    })
}

export class UserManager {
  #refreshTokenPromise

  constructor () {
    this.origin = window.location.origin
  }

  getUser () {
    try {
      const value = Vue.cookie.get(COOKIE_HEADER_PAYLOAD)
      if (value) {
        return decode(value)
      }
    } catch { /* ignore error */ }
    return null
  }

  removeUser () {
    Vue.cookie.delete(COOKIE_HEADER_PAYLOAD)
  }

  signout (err) {
    this.removeUser()
    const url = new URL('/auth/logout', this.origin)
    if (err) {
      url.searchParams.set('error[message]', err.message)
    }
    this.redirect(url)
  }

  signin () {
    const url = new URL('/login', this.origin)
    this.redirect(url)
  }

  signinWithOidc (redirectPath = '/') {
    const url = new URL('/auth', this.origin)
    const redirectUrl = new URL(redirectPath, this.origin)
    url.searchParams.set('redirectUrl', redirectUrl)
    this.redirect(url)
  }

  redirect (url) {
    window.location = url
  }

  ensureValidToken (tolerance) {
    const user = this.getUser()
    if (!user) {
      return Promise.reject(createNoUserError())
    }
    if (!isRefreshRequired(user, tolerance)) {
      return Promise.resolve()
    }
    if (!this.#refreshTokenPromise) {
      const name = 'token-refresh-request-' + user?.rti
      this.#refreshTokenPromise = navigator.locks
        .request(name, () => {
          const user = this.getUser()
          if (!user) {
            return Promise.reject(createNoUserError())
          }
          if (!isRefreshRequired(user, tolerance)) {
            return Promise.resolve()
          }
          return createTokenRefreshRequest()
            .catch(err => {
              switch (err.name) {
                case 'UnauthorizedError': {
                  window.requestAnimationFrame(() => this.signout(err))
                  break
                }
                case 'NoUserError': {
                  window.requestAnimationFrame(() => this.signin())
                  break
                }
              }
              throw err
            })
        })
        .finally(() => {
          this.#refreshTokenPromise = undefined
        })
    }
    return this.#refreshTokenPromise
  }

  isRefreshRequired (tolerance) {
    return isRefreshRequired(this.getUser(), tolerance)
  }

  isSessionExpired (tolerance) {
    return isSessionExpired(this.getUser(), tolerance)
  }
}
