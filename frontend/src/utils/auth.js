//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import decode from 'jwt-decode'

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
