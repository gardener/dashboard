//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createRouter as createVueRouter,
  createWebHistory,
  isNavigationFailure,
  NavigationFailureType,
} from 'vue-router'

import { useAppStore } from '@/store/app'

import { useLogger } from '@/composables/useLogger'

import { createRoutes } from './routes'
import {
  createGlobalBeforeGuards,
  createGlobalResolveGuards,
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
    logger.error('Uncaught error inside of a navigation guard: %s', err.stack)
    appStore.loading = false
    appStore.setRouterError(err)
  })

  router.afterEach((to, from, failure) => {
    if (isNavigationFailure(failure)) {
      if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
        logger.info('Navigation was prevented because we are already at the target location: %s', failure)
      } else if (isNavigationFailure(failure, NavigationFailureType.canceled)) {
        logger.info('Navigation took place before the current navigation could finish: %s', failure)
      } else if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
        logger.info('Navigation was aborted inside of a navigation guard: %s', failure)
      } else {
        logger.info('Navigation failure: %s', failure)
      }
    }
  })

  return router
}

export function registerGlobalBeforeGuards (router) {
  const guards = createGlobalBeforeGuards()
  for (const guard of guards) {
    router.beforeEach(guard)
  }
}

export function registerGlobalResolveGuards (router) {
  const guards = createGlobalResolveGuards()
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
