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
import {
  computed,
  shallowRef,
} from 'vue'
import { toValue } from '@vueuse/core'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import { useAuthzStore } from '../authz'
import { useConfigStore } from '../config'
import { useCloudProfileStore } from '../cloudProfile'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useProjectStore } from '../project'
import { useSecretStore } from '../secret'
import { useAppStore } from '../app'
import { useSeedStore } from '../seed'

import { createStoreDefinition } from './definition'

import { get } from '@/lodash'

export const useShootContextStore = defineStore('shootContext', () => {
  const logger = useLogger()
  const api = useApi()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const cloudProfileStore = useCloudProfileStore()
  const projectStore = useProjectStore()
  const secretStore = useSecretStore()
  const seedStore = useSeedStore()
  const gardenerExtensionStore = useGardenerExtensionStore()

  const context = {
    logger,
    appStore,
    authzStore,
    configStore,
    cloudProfileStore,
    projectStore,
    secretStore,
    seedStore,
    gardenerExtensionStore,
  }

  Object.defineProperty(context, 'shootContextStore', {
    get () {
      return useShootContextStore()
    },
  })

  const shootManifestEditor = shallowRef(null)

  const storeDefinition = createStoreDefinition(context)

  const {
    shootManifest,
    resetShootManifest,
  } = storeDefinition

  function $reset () {
    resetShootManifest()
    shootManifestEditor.value = null
  }

  async function createShoot (data = toValue(shootManifest)) {
    const namespace = get(data, 'metadata.namespace', authzStore.namespace)
    await api.createShoot({ namespace, data })
    appStore.setSuccess('Cluster created')
  }

  return {
    /* state */
    ...storeDefinition,
    shootManifestEditor,
    /* actions */
    createShoot,
    $reset,
    /* aliases */
    shootObject: shootManifest,
    cmInstance: shootManifestEditor,
  }
})

export default useShootContextStore

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootContextStore, import.meta.hot))
}
