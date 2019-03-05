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

import Vue from 'vue'
import decode from 'jwt-decode'
import { createTokenReview } from './api'

export class UserManager {
  constructor () {
    this.origin = window.location.origin
    this.key = 'gHdrPyl'
  }

  getUser () {
    try {
      const value = Vue.cookie.get(this.key)
      if (value) {
        return decode(value)
      }
    } catch { /* ignore error */ }
    return null
  }

  removeUser () {
    Vue.cookie.delete(this.key)
  }

  signout () {
    this.removeUser()
    window.location = this.origin + '/auth/logout'
  }

  signin (token) {
    if (token) {
      return createTokenReview({ token })
    }
    window.location = this.origin + '/auth'
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
