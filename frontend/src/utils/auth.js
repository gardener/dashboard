//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import querystring from 'querystring'
import decode from 'jwt-decode'

export class UserManager {
  constructor (settings = {}) {
    const origin = settings.origin || window.location.origin
    this.key = `garden.user:${origin}`
    this.storage = settings.storage || window.localStorage
  }

  getUser () {
    try {
      const value = this.storage.getItem(this.key)
      if (value) {
        return JSON.parse(value)
      }
    } catch (err) {
      this.removeUser()
    }
  }

  setUser (user) {
    if (user) {
      this.storage.setItem(this.key, JSON.stringify(user))
    } else {
      this.removeUser()
    }
  }

  removeUser () {
    this.storage.removeItem(this.key)
  }

  signout () {
    this.removeUser()
  }

  signin () {
    window.location = '/auth'
  }

  signinRedirectCallback ({ hash = '' } = {}) {
    const { username, groups, ...user } = querystring.parse(hash.replace(/^#/, ''))
    user.profile = {
      name: username,
      email: username,
      groups
    }
    this.setUser(user)
    return user
  }

  isUserLoggedIn () {
    const user = this.getUser()
    if (!user || !user.id_token) {
      return false
    }
    const expiresAt = parseInt(user.expires_at, 10)
    if (typeof expiresAt === 'number' && !isNaN(expiresAt)) {
      return 1000 * expiresAt > Date.now()
    }
    try {
      return !isTokenExpired(user.id_token)
    } catch (err) {
      return true
    }
  }
}

function getTokenExpirationDate (encodedToken) {
  const token = decode(encodedToken)
  const date = new Date(0)
  date.setUTCSeconds(token.exp || 253402297199)
  return date
}

function isTokenExpired (token) {
  if (!token) {
    return true
  }
  const expirationDate = getTokenExpirationDate(token)
  return expirationDate < new Date()
}
