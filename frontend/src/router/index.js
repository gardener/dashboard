//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createRouter as createVueRouter,
  createWebHistory,
} from 'vue-router'

import { useAppStore } from '@/store/app'

import { useLogger } from '@/composables/useLogger'

import { createRoutes } from './routes'
import {
  createGlobalBeforeGuards,
  createGlobalAfterHooks,
} from './guards'

const zeroPoint = { left: 0, top: 0 }

export function createRouter () {
  const logger = useLogger()
  const appStore = useAppStore()

  const router = createVueRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: createRoutes(),
    scrollBehavior (to, from, savedPosition) {
      return savedPosition || zeroPoint
    },
  })

  router.onError(err => {
    logger.error('Router error:', err)
    appStore.loading = false
    appStore.setError(err)
    router.push({ name: 'Error' })
  })

  return router
}

export function registerGlobalBeforeGuards (router) {
  const guards = createGlobalBeforeGuards()
  for (const guard of guards) {
    router.beforeEach(guard)
  }
}

export function registerGlobalAfterHooks (router) {
  const hooks = createGlobalAfterHooks()
  for (const hook of hooks) {
    router.afterEach(hook)
  }
}
