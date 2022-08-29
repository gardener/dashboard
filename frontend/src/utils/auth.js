//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import decode from 'jwt-decode'
import createError, { isHttpError } from 'http-errors'

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'

function now () {
  return Math.floor(Date.now() / 1000)
}

export class UserManager {
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
      // this request must not be intercepted, otherwise this would lead to an infinite loop
      const res = await fetch('/auth/token', { cache: 'no-store' })
      if (res.status === 401) {
        const err = createError(401, 'Failed to obtain new id_token by using refresh_token')
        try {
          const body = await res.json()
          if (body.message) {
            err.message = body.message
          }
        } catch (err) { /* ignore error */ }
        throw err
      }
    } catch (err) {
      if (isHttpError(err) && err.statusCode === 401) {
        throw err
      }
    }
  }

  isRefreshRequired (tolerance = 30) {
    const t = this.timeUntil('refresh_at')
    return typeof t === 'number' && t < tolerance
  }

  timeUntil (key) {
    try {
      const user = this.getUser()
      if (user) {
        const t = Number(user[key])
        if (!Number.isNaN(t)) {
          return t - now()
        }
      }
    } catch (err) { /* ignore error */ }
  }

  isSessionExpired (tolerance = 1) {
    const t = this.timeUntil('exp')
    return typeof t === 'number' && t < tolerance
  }
}
