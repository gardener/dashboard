//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import decode from 'jwt-decode'
import { createTokenReview } from './api'

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'

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
    window.location = url
  }

  signinWithOidc (redirectPath = '/') {
    const url = new URL('/auth', this.origin)
    url.searchParams.set('redirectUrl', new URL(redirectPath, this.origin))
    window.location = url
  }

  signinWithToken (token) {
    return createTokenReview({ token })
  }

  isUserLoggedIn () {
    try {
      const user = this.getUser()
      if (user) {
        const exp = user.exp
        if (typeof exp === 'number' && !isNaN(exp)) {
          return 1000 * exp > Date.now()
        }
      }
    } catch (err) { /* ignore error */ }
    return false
  }
}
