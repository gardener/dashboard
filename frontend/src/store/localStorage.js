//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  computed,
  toRef,
  effectScope,
} from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useProjectStore } from '@/store/project'

import { useLogger } from '@/composables/useLogger'

import { StorageSerializers } from '@/utils/storageSerializers'
import { routeName as getRouteName } from '@/utils'

const kLocalStorageKey = Symbol('kLocalStorageKey')
const kLocalStorageScope = Symbol('kLocalStorageScope')

function createLocalStorageRef (key, initialValue) {
  let localStorageRef
  const scope = effectScope()
  scope.run(() => {
    localStorageRef = useLocalStorage(key, initialValue, {
      serializer: StorageSerializers.json,
      writeDefaults: false,
    })
  })
  Object.defineProperties(localStorageRef, {
    [kLocalStorageScope]: {
      value: scope,
      enumerable: true,
    },
    [kLocalStorageKey]: {
      value: key,
      enumerable: true,
    },
  })
  return localStorageRef
}

// Route is only required for terminalSplitpaneTree
const useLazyLocalStorage = route => {
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
      /* eslint-disable security/detect-object-injection */
      const currentKey = refs[name]?.[kLocalStorageKey]
      const key = keys[name]
      if (currentKey !== key) {
        refs[name]?.[kLocalStorageScope].stop()
        refs[name] = createLocalStorageRef(key, initialValue)
      }
      return refs[name]
      /* eslint-enable security/detect-object-injection */
    }
  }

  return Object.defineProperties({}, {
    terminalSplitpaneTree: {
      get: createGetter('terminalSplitpaneTree', null),
    },
    shootCustomSelectedColumns: {
      get: createGetter('shootCustomSelectedColumns', {}),
    },
    shootCustomSortBy: {
      get: createGetter('shootCustomSortBy', []),
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

  const operatorFeatures = useLocalStorage('global/operator-features', false, {
    serializer: StorageSerializers.flag,
    writeDefaults: false,
  })

  const hiddenMessages = useLocalStorage('global/alert-banner/hidden-messages', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const editorShortcuts = useLocalStorage('global/editor/shortcuts', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const renderEditorWhitespaes = useLocalStorage('global/editor/render-whitespaces', false, {
    serializer: StorageSerializers.flag,
    writeDefaults: false,
  })

  const shootAdminKubeconfigExpiration = useLocalStorage('global/shoot-admin-kubeconfig-expiration', 0, {
    serializer: StorageSerializers.integer,
    writeDefaults: false,
  })

  const workspaceStorage = useLocalStorage('global/workspace', '', {
    serializer: StorageSerializers.string,
    writeDefaults: false,
  })

  const userSelectedColumns = useLocalStorage('members/useraccount-list/selected-columns', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const userSortBy = useLocalStorage('members/useraccount-list/sortBy', [{
    key: 'username',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const serviceAccountSelectedColumns = useLocalStorage('members/serviceaccount-list/selected-columns', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const serviceAccountSortBy = useLocalStorage('members/serviceaccount-list/sortBy', [{
    key: 'displayName',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const infraCredentialSelectedColumns = useLocalStorage('secrets/infra-secret-list/selected-columns', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const infraCredentialSortBy = useLocalStorage('secrets/infra-secret-list/sortBy', [{
    key: 'name',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const dnsCredentialSelectedColumns = useLocalStorage('secrets/dns-secret-list/selected-columns', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const dnsCredentialSortBy = useLocalStorage('secrets/dns-secret-list/sortBy', [{
    key: 'name',
    order: 'asc',
  }], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const shootSelectedColumns = useLocalStorage('projects/shoot-list/selected-columns', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const shootSortBy = useLocalStorage('projects/shoot-list/sortBy', [], {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const allProjectsShootFilter = useLocalStorage('project/_all/shoot-list/filter', {}, {
    serializer: StorageSerializers.json,
    writeDefaults: false,
  })

  const shootListFetchFromCache = useLocalStorage('projects/shoot-list/fetch-from-cache', false, {
    serializer: StorageSerializers.flag,
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

  const terminalSplitpaneTreeRef = function (route) {
    // use dedicated scope for terminalSplitpaneTree with route
    // Route must be passed by caller to ensure correct context
    const lazyLocalStorageWithRoute = useLazyLocalStorage(route)
    return lazyLocalStorageWithRoute.terminalSplitpaneTree
  }

  const workspace = computed({
    get () {
      const workspaceName = workspaceStorage.value
      if (workspaceName === '') {
        return undefined
      }
      return workspaceName
    },
    set (value) {
      workspaceStorage.value = value
    },
  })

  return {
    colorScheme,
    autoLogin,
    operatorFeatures,
    logLevel,
    hiddenMessages,
    editorShortcuts,
    renderEditorWhitespaes,
    shootAdminKubeconfigExpiration,
    userSelectedColumns,
    userSortBy,
    serviceAccountSelectedColumns,
    serviceAccountSortBy,
    infraCredentialSelectedColumns,
    infraCredentialSortBy,
    dnsCredentialSelectedColumns,
    dnsCredentialSortBy,
    shootSelectedColumns,
    shootSortBy,
    allProjectsShootFilter,
    shootListFetchFromCache,
    shootCustomSortBy,
    shootCustomSelectedColumns,
    terminalSplitpaneTreeRef,
    workspace,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLocalStorageStore, import.meta.hot))
}
