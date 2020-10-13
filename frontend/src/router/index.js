//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import Router from 'vue-router'

import createRoutes from './routes'
import createGuards from './guards'

Vue.use(Router)

const userManager = Vue.auth

export default function createRouter (store) {
  const zeroPoint = { x: 0, y: 0 }

  const routerOptions = {
    mode: 'history',
    base: process.env.BASE_URL,
    scrollBehavior (to, from, savedPosition) {
      return savedPosition || zeroPoint
    },
    routes: createRoutes(store)
  }

  /* automatic signout when token expires */
  let timeoutID
  store.watch((state, getters) => getters.userExpiresAt, expirationTime => {
    if (timeoutID) {
      clearTimeout(timeoutID)
    }
    const currentTime = Date.now()
    if (expirationTime) {
      if (expirationTime > currentTime) {
        const delay = expirationTime - currentTime
        timeoutID = setTimeout(() => userManager.signout(), delay)
      } else {
        console.error('Expiration time of a new token is not expected to be in the past')
      }
    }
  })

  /* router */
  const router = new Router(routerOptions)

  /* navigation guards */
  const guards = createGuards(store, userManager)
  for (const guard of guards.beforeEach) {
    router.beforeEach(guard)
  }
  for (const guard of guards.afterEach) {
    router.afterEach(guard)
  }

  /* router error */
  router.onError(err => {
    console.error('Router error:', err)
    store.commit('SET_LOADING', false)
    store.commit('SET_ALERT', { type: 'error', message: err.message })
    router.push({ name: 'Error' })
  })

  return router
}
