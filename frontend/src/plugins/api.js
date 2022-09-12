//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import api, { interceptors } from '@/utils/api'

function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const VueApi = {
  registerRequestInterceptor (auth) {
    this.unregister = interceptors.register({
      requestFulfilled (...args) {
        const url = args[0] ?? ''
        if (!url.startsWith('/api')) {
          return Promise.resolve(args)
        }
        return auth.ensureValidToken()
          .then(() => args)
          .catch(() => {
            // Delay the AbortError by 1 sec to avoid router navigation before redirection to signout URL is finished
            return delay(1000).then(() => {
              const err = new Error('Request Aborted')
              err.name = 'AbortError'
              throw err
            })
          })
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
