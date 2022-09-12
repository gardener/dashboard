//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import Router from 'vue-router'

import createRoutes from './routes'
import createGuards from './guards'

Vue.use(Router)

const userManager = Vue.auth
const localStorage = Vue.localStorage
const logger = Vue.logger

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
        timeoutID = setTimeout(() => {
          logger.info('Session is expiring --> Redirecting to logout page')
          userManager.signout()
        }, delay)
      } else {
        logger.error('Expiration time of a new token is not expected to be in the past')
      }
    }
  })

  /* router */
  const router = new Router(routerOptions)

  /* navigation guards */
  const guards = createGuards(store, userManager, localStorage, logger)
  for (const guard of guards.beforeEach) {
    router.beforeEach(guard)
  }
  for (const guard of guards.afterEach) {
    router.afterEach(guard)
  }

  /* router error */
  router.onError(err => {
    logger.error('Router error:', err)
    store.commit('SET_LOADING', false)
    store.commit('SET_ALERT', { type: 'error', message: err.message })
    router.push({ name: 'Error' })
  })

  return router
}
