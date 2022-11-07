//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import decode from 'jwt-decode'
import {
  createError,
  createNoUserError,
  createClockSkewError,
  isUnauthorizedError,
  isNoUserError,
  isClockSkewError
} from './errors'

const logger = Vue.logger

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'
const CLOCK_TOLERANCE = 15

function delay (duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
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

function isRefreshRequired (user = {}) {
  if (!user.rti || !user.refresh_at) {
    return false
  }
  const t = secondsUntil(user.refresh_at)
  return typeof t === 'number' && t < CLOCK_TOLERANCE
}

function isSessionExpired (user = {}) {
  if (!user.exp) {
    return true
  }
  const t = secondsUntil(user.exp)
  return typeof t === 'number' && t < CLOCK_TOLERANCE
}

function decodeCookie () {
  try {
    const value = Vue.cookie.get(COOKIE_HEADER_PAYLOAD)
    if (value) {
      return decode(value)
    }
  } catch { /* ignore error */ }
  return null
}

function deleteCookie () {
  Vue.cookie.delete(COOKIE_HEADER_PAYLOAD)
}

async function createTokenRefreshRequest () {
  const timestamp = Math.floor(Date.now() / 1000)
  const response = await fetch('/auth/token', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ timestamp })
  })

  const statusCode = response.status
  if (statusCode >= 200 && statusCode < 300) {
    const user = decodeCookie()
    if (!user) {
      throw createNoUserError()
    }
    if (isRefreshRequired(user)) {
      throw createClockSkewError()
    }
    return user
  }

  if (statusCode >= 400) {
    let message = `Token refresh failed with status code ${statusCode}`
    try {
      const data = await response.json()
      Object.defineProperty(response, 'data', { value: data })
      if (data.message) {
        message = data.message
        if (statusCode === 401) {
          /*
           * The OPError message has the following format `${error} (${error_description})`
           * (see https://github.com/panva/node-openid-client/blob/1e3892e6222fdd1956735f97584ebc722fcebdd3/lib/errors.js#L5)
           * The error and the error_description are values returned in the error response
           * from the the OpenID Connect Provider (OP). We use the original OP error_description
           * as error message if possible.
           */
          const matches = /^(.+) \((.+)\)$/.exec(message)
          if (matches && matches.length > 2) {
            message = matches[2]
          }
        }
      }
    } catch (err) { /* ignore error */ }
    throw createError(statusCode, message, { response })
  }

  throw createError(statusCode, 'Token refresh failed', { response })
}

export class UserManager {
  #refreshTokenPromise

  constructor () {
    this.origin = window.location.origin
  }

  getUser () {
    return decodeCookie()
  }

  removeUser () {
    deleteCookie()
  }

  signout (err) {
    this.removeUser()
    const url = new URL('/auth/logout', this.origin)
    if (err) {
      url.searchParams.set('error[name]', err.name)
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

  async refreshToken () {
    try {
      let user = decodeCookie()
      if (!user) {
        throw createNoUserError()
      }
      if (!isRefreshRequired(user)) {
        return
      }
      logger.debug('Acquiring token refresh lock (%s)', user.rti)
      await navigator.locks.request('token-refresh-request', async () => {
        user = decodeCookie()
        if (!user) {
          throw createNoUserError()
        }
        if (!isRefreshRequired(user)) {
          return
        }
        logger.debug('Refreshing token (%s)', user.rti)
        const oldUser = user
        user = await createTokenRefreshRequest()
        logger.debug('Token has been refreshed (%s <- %s)', user.rti, oldUser.rti)
      })
    } catch (err) {
      logger.error('Token refresh failed: %s - %s', err.name, err.message)
      let frameRequestCallback
      if (isNoUserError(err)) {
        frameRequestCallback = () => this.signin()
      } else if (isUnauthorizedError(err) || isClockSkewError(err)) {
        frameRequestCallback = () => this.signout(err)
      }
      if (typeof frameRequestCallback === 'function') {
        window.requestAnimationFrame(frameRequestCallback)
        // delay the error by 500 ms to avoid rendering or navigation before redirection has started
        await delay(500)
      }
      throw err
    }
  }

  ensureValidToken () {
    if (!this.#refreshTokenPromise) {
      this.#refreshTokenPromise = this.refreshToken().finally(() => {
        this.#refreshTokenPromise = undefined
      })
    }
    return this.#refreshTokenPromise
  }

  isSessionExpired () {
    return isSessionExpired(this.getUser())
  }
}
