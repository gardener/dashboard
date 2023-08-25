//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import {
  computed,
  toRef,
} from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'

import { useProjectStore } from '@/store/project'

import { useLogger } from '@/composables/useLogger'

import { StorageSerializers } from '@/utils/storageSerializers'
import { routeName as getRouteName } from '@/utils'

const kLocalStorageKey = Symbol('kLocalStorageKey')

const useLazyLocalStorage = () => {
  const route = useRoute()
  const projectStore = useProjectStore()

  const keys = {
    get terminalSplitpaneTree () {
      const routeName = getRouteName(route)
      const { name, namespace } = route.params
      const keys = [routeName, namespace]
      if (name) {
        keys.push(name)
      }
      return keys.join('--')
    },
    get shootCustomSelectedColumns () {
      return `project/${projectStore.projectName}/shoot-list/selected-columns`
    },
    get shootCustomSortBy () {
      return `project/${projectStore.projectName}/shoot-list/sortBy`
    },
  }

  const refs = {
    terminalSplitpaneTree: null,
    shootCustomSelectedColumns: null,
    shootCustomSortBy: null,
  }

  const createGetter = (name, initialValue = null) => {
    return () => {
      const currentKey = refs[name]?.[kLocalStorageKey]
      const key = keys[name]
      if (currentKey !== key) {
        refs[name] = useLocalStorage(key, initialValue, {
          serializer: StorageSerializers.json,
          writeDefaults: false,
        })
        Object.defineProperty(refs[name], kLocalStorageKey, {
          value: key,
        })
      }
      return refs[name]
    }
  }

  return Object.defineProperties({}, {
    terminalSplitpaneTree: {
      get: createGetter('terminalSplitpaneTree', null),
    },
    shootCustomSelectedColumns: {
      get: createGetter('shootCustomSelectedColumns', null),
    },
    shootCustomSortBy: {
      get: createGetter('shootCustomSortBy', null),
    },
  })
}

export const useLocalStorageStore = defineStore('localStorage', () => {
  const logger = useLogger()

  const logLevel = toRef(logger, 'logLevel')

  const initialColorScheme = 'auto'
  const colorSchemes = ['light', 'dark', 'auto']
  const colorSchemeSerializer = StorageSerializers.enum(colorSchemes, () => colorScheme.value, initialColorScheme)
  const colorScheme = useLocalStorage('global/color-scheme', initialColorScheme, {
    serializer: colorSchemeSerializer,
    writeDefaults: false,
  })

  const autoLogin = useLocalStorage('global/auto-login', false, {
    serializer: StorageSerializers.flag,
    writeDefaults: false,
  })

  const hiddenMessages = useLocalStorage('global/alert-banner/hidden-messages', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const userSelectedColumns = useLocalStorage('members/useraccount-list/selected-columns', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const userItemsPerPage = useLocalStorage('members/useraccount-list/itemsPerPage', 10, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const userSortBy = useLocalStorage('members/useraccount-list/sortBy', [{
    key: 'username',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const serviceAccountSelectedColumns = useLocalStorage('members/serviceaccount-list/selected-columns', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const serviceAccountItemsPerPage = useLocalStorage('members/serviceaccount-list/itemsPerPage', 10, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const serviceAccountSortBy = useLocalStorage('members/serviceaccount-list/sortBy', [{
    key: 'displayName',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const infraSecretSelectedColumns = useLocalStorage('secrets/infra-secret-list/selected-columns', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const infraSecretItemsPerPage = useLocalStorage('secrets/infra-secret-list/itemsPerPage', 10, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const infraSecretSortBy = useLocalStorage('secrets/infra-secret-list/sortBy', [{
    key: 'name',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const dnsSecretSelectedColumns = useLocalStorage('secrets/dns-secret-list/selected-columns', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const dnsSecretItemsPerPage = useLocalStorage('secrets/dns-secret-list/itemsPerPage', 10, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const dnsSecretSortBy = useLocalStorage('secrets/dns-secret-list/sortBy', [{
    key: 'name',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const shootSelectedColumns = useLocalStorage('projects/shoot-list/selected-columns', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const shootItemsPerPage = useLocalStorage('projects/shoot-list/itemsPerPage', 10, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const shootSortBy = useLocalStorage('projects/shoot-list/sortBy', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const allShootsFilter = useLocalStorage('project/_all/shoot-list/filter', null, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const lazyLocalStorage = useLazyLocalStorage()

  const shootCustomSelectedColumns = computed({
    get () {
      return lazyLocalStorage.shootCustomSelectedColumns.value
    },
    set (value) {
      lazyLocalStorage.shootCustomSelectedColumns.value = value
    },
  })

  const shootCustomSortBy = computed({
    get () {
      return lazyLocalStorage.shootCustomSortBy.value
    },
    set (value) {
      lazyLocalStorage.shootCustomSortBy.value = value
    },
  })

  const terminalSplitpaneTree = computed({
    get () {
      return lazyLocalStorage.terminalSplitpaneTree.value
    },
    set (value) {
      lazyLocalStorage.terminalSplitpaneTree.value = value
    },
  })

  return {
    colorScheme,
    autoLogin,
    logLevel,
    hiddenMessages,
    userSelectedColumns,
    userItemsPerPage,
    userSortBy,
    serviceAccountSelectedColumns,
    serviceAccountItemsPerPage,
    serviceAccountSortBy,
    infraSecretSelectedColumns,
    infraSecretItemsPerPage,
    infraSecretSortBy,
    dnsSecretSelectedColumns,
    dnsSecretItemsPerPage,
    dnsSecretSortBy,
    shootSelectedColumns,
    shootItemsPerPage,
    shootSortBy,
    allShootsFilter,
    shootCustomSortBy,
    shootCustomSelectedColumns,
    terminalSplitpaneTree,
  }
})
