/* eslint-disable no-unused-vars */
//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'

import { useLogger } from '@/composables/useLogger'
import { useShootContext } from '@/composables/useShootContext'

import { useAuthzStore } from './authz'
import { useConfigStore } from './config'
import { useCloudProfileStore } from './cloudProfile'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useProjectStore } from './project'
import { useSecretStore } from './secret'
import { useAppStore } from './app'
import { useSeedStore } from './seed'

export const useShootContextStore = defineStore('shootContext', () => {
  const logger = useLogger()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const cloudProfileStore = useCloudProfileStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const projectStore = useProjectStore()
  const secretStore = useSecretStore()
  const seedStore = useSeedStore()

  return useShootContext({
    logger,
    appStore,
    authzStore,
    configStore,
    cloudProfileStore,
    gardenerExtensionStore,
    projectStore,
    secretStore,
    seedStore,
  })
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootContextStore, import.meta.hot))
}
