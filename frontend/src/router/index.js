//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createRouter as createVueRouter, createWebHistory } from 'vue-router'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useAuthnStore } from '@/store/authn'
import { useProjectStore } from '@/store/project'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useKubeconfigStore } from '@/store/kubeconfig'
import { useMemberStore } from '@/store/member'
import { useSecretStore } from '@/store/secret'
import { useSeedStore } from '@/store/seed'
import { useShootStore } from '@/store/shoot'
import { useTerminalStore } from '@/store/terminal'

import { createRoutes } from './routes'
import { createGuards } from './guards'
import { useLogger } from '@/composables'

export function createRouter () {
  const logger = useLogger()
  const appStore = useAppStore()
  const configStore = useConfigStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const seedStore = useSeedStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const kubeconfigStore = useKubeconfigStore()
  const memberStore = useMemberStore()
  const secretStore = useSecretStore()
  const shootStore = useShootStore()
  const terminalStore = useTerminalStore()

  const context = {
    logger,
    appStore,
    configStore,
    authnStore,
    authzStore,
    projectStore,
    cloudProfileStore,
    seedStore,
    gardenerExtensionStore,
    kubeconfigStore,
    memberStore,
    secretStore,
    shootStore,
    terminalStore,
  }

  const zeroPoint = { left: 0, top: 0 }

  /* router */
  const routes = createRoutes(context)
  const router = createVueRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior (to, from, savedPosition) {
      return savedPosition || zeroPoint
    },
  })

  /* navigation guards */
  const guards = createGuards(context)
  for (const guard of guards.beforeEach) {
    router.beforeEach(guard)
  }
  for (const guard of guards.afterEach) {
    router.afterEach(guard)
  }

  /* router error */
  router.onError(err => {
    logger.error('Router error:', err)
    appStore.loading = false
    appStore.alert = {
      type: 'error',
      message: err.message,
    }
    router.push({ name: 'Error' })
  })

  return router
}
