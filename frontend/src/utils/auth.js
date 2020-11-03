//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
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
    let path = '/auth/logout'
    if (err) {
      path += `?error[message]=${encodeURIComponent(err.message)}`
    }
    window.location = this.origin + path
  }

  signinWithOidc (redirectPath) {
    let path = '/auth'
    if (redirectPath) {
      path += `?redirectPath=${encodeURIComponent(redirectPath)}`
    }
    window.location = this.origin + path
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
