//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import api, { interceptors } from '@/utils/api'
import { createAbortError } from '@/utils/errors'

const VueApi = {
  registerRequestInterceptor (auth) {
    this.unregister = interceptors.register({
      async requestFulfilled (...args) {
        const url = args[0] ?? ''
        if (url.startsWith('/api')) {
          try {
            await auth.ensureValidToken()
          } catch (err) {
            throw createAbortError('Request aborted')
          }
        }
        return args
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
