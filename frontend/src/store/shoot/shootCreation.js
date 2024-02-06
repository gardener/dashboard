import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  shallowRef,
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import { useAppStore } from '../app'
import { useAuthzStore } from '../authz'
import { useCloudProfileStore } from '../cloudProfile'
import { useConfigStore } from '../config'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useSecretStore } from '../secret'
import { useShootStagingStore } from '../shootStaging'

import { createShootResource } from './helper'

import {
  cloneDeep,
  isEqual,
} from '@/lodash'

const useShootCreationStore = defineStore('shootCreation', () => {
  const logger = useLogger()
  const api = useApi()

  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const secretStore = useSecretStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const shootStagingStore = useShootStagingStore()

  const initialShootObject = shallowRef(null)
  const shootObject = ref(null)
  const editor = shallowRef(null)

  function isShootDirty (object) {
    return !isEqual(initialShootObject.value, object)
  }

  async function createShoot (data) {
    const namespace = data.metadata.namespace || authzStore.namespace
    await api.createShoot({ namespace, data })
    appStore.setSuccess('Cluster created')
  }

  function replaceShoot (value) {
    shootObject.value = value
  }

  function $reset () {
    const shootCreationStore = this
    const shootObject = createShootResource({
      logger,
      appStore,
      authzStore,
      configStore,
      secretStore,
      cloudProfileStore,
      gardenerExtensionStore,
    })
    shootCreationStore.$patch(state => {
      state.initialShootObject = shootObject
      state.shootObject = cloneDeep(shootObject)
    })
    editor.value = null
    shootStagingStore.workerless = false
  }

  return {
    editor,
    shootObject,
    isShootDirty,
    replaceShoot,
    createShoot,
    $reset,
  }
})

export default useShootCreationStore

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootCreationStore, import.meta.hot))
}
