//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import api, { interceptors } from '@/utils/api'
import get from 'lodash/get'

const VueApi = {
  registerRequestInterceptor (auth) {
    let refreshTokenPromise
    this.unregister = interceptors.register({
      requestFulfilled (...args) {
        const url = args[0] ?? ''
        if (!url.startsWith('/api') || !auth.isRefreshRequired(30)) {
          return Promise.resolve(args)
        }
        if (!refreshTokenPromise) {
          refreshTokenPromise = auth.refreshToken()
          refreshTokenPromise.finally(() => {
            refreshTokenPromise = undefined
          })
        }
        return refreshTokenPromise
          .catch(err => {
            console.error('Token refresh failed: %s - %s', err.name, get(err, 'response.data.message', err.message))
            auth.signout(new Error('Token refresh failed'))
          })
          .then(() => args)
      }
    })
  },
  install (Vue) {
    this.registerRequestInterceptor(Vue.auth)
    Object.defineProperty(Vue, 'api', { value: api })
    Object.defineProperty(Vue.prototype, '$api', { value: api })
  }
}

Vue.use(VueApi)
