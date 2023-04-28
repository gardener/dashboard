//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createRouter as createVueRouter, createWebHistory } from 'vue-router'

import { useAppStore } from '@/store/app'
import { useLogger } from '@/composables/useLogger'

import { createRoutes } from './routes'
import { createGuards } from './guards'

export function createRouter () {
  const logger = useLogger()
  const store = useAppStore()

  const zeroPoint = { left: 0, top: 0 }

  /* router */
  const routes = createRoutes()
  const router = createVueRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior (to, from, savedPosition) {
      return savedPosition || zeroPoint
    },
  })

  /* navigation guards */
  const guards = createGuards()
  for (const guard of guards.beforeEach) {
    router.beforeEach(guard)
  }
  for (const guard of guards.afterEach) {
    router.afterEach(guard)
  }

  /* router error */
  router.onError(err => {
    logger.error('Router error:', err)
    store.loading = false
    store.alert = {
      type: 'error',
      message: err.message,
    }
    router.push({ name: 'Error' })
  })

  return router
}
