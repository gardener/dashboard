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
  ref,
  computed,
} from 'vue'
import { patch as jsondiffpatchPatch } from 'jsondiffpatch'

import { useConfigStore } from '@/store/config'

import { useApi } from '@/composables/useApi'

import { getCloudProfileSpec } from '@/utils'

import cloneDeep from 'lodash/cloneDeep'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import find from 'lodash/find'
import flatten from 'lodash/flatten'

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const api = useApi()

  const configStore = useConfigStore()

  const list = ref(null)
  const namespacedList = ref(null)
  const namespacedListsByNamespace = ref({})

  const isInitial = computed(() => {
    return list.value === null
  })

  const isNamespacedInitial = computed(() => {
    return Object.keys(namespacedListsByNamespace.value).length === 0
  })

  const cloudProfileList = computed(() => {
    return list.value
  })

  const namespacedCloudProfileList = computed(() => {
    return namespacedList.value
  })

  async function fetchCloudProfiles () {
    const response = await api.getCloudProfiles()
    setCloudProfiles(response.data)
  }

  async function fetchNamespacedCloudProfiles (namespace) {
    if (!namespace) {
      return
    }
    const response = await api.getNamespacedCloudProfiles({ namespace })
    setNamespacedCloudProfiles(response.data, namespace)
  }

  async function fetchNamespacedCloudProfilesForNamespaces (namespaces = []) {
    const namespacesToFetch = uniq(namespaces)
      .filter(Boolean)
      .filter(namespace => !hasNamespacedCloudProfilesForNamespace(namespace))

    await Promise.all(namespacesToFetch.map(namespace => fetchNamespacedCloudProfiles(namespace)))
  }

  function setCloudProfiles (cloudProfiles) {
    list.value = cloudProfiles
  }

  function rehydrateNamespacedProfiles (profiles) {
    if (!profiles) {
      return profiles
    }
    return profiles.map(profile => {
      const { cloudProfileSpecDiff } = profile.status ?? {}
      if (!('cloudProfileSpecDiff' in (profile.status ?? {}))) {
        // Already has cloudProfileSpec (non-diff response) — pass through unchanged
        return profile
      }
      const parentName = profile.spec?.parent?.name
      const parent = find(list.value, ['metadata.name', parentName])
      if (!parent) {
        return profile
      }
      if (cloudProfileSpecDiff === null) {
        // No changes from parent — spec is identical
        profile.status.cloudProfileSpec = cloneDeep(parent.spec)
      } else {
        // Apply delta on top of parent spec
        profile.status.cloudProfileSpec = jsondiffpatchPatch(cloneDeep(parent.spec), cloudProfileSpecDiff)
      }
      delete profile.status.cloudProfileSpecDiff
      return profile
    })
  }

  function setNamespacedCloudProfiles (namespacedCloudProfiles, namespace) {
    if (!namespace) {
      throw new TypeError('namespace is required')
    }
    const rehydrated = rehydrateNamespacedProfiles(namespacedCloudProfiles)
    namespacedListsByNamespace.value = {
      ...namespacedListsByNamespace.value,
      [namespace]: rehydrated,
    }
    namespacedList.value = flatten(Object.values(namespacedListsByNamespace.value))
  }

  function hasNamespacedCloudProfilesForNamespace (namespace) {
    if (!namespace) {
      return false
    }
    return Object.prototype.hasOwnProperty.call(namespacedListsByNamespace.value, namespace)
  }

  const allCloudProfiles = computed(() => {
    return [...(list.value ?? []), ...(namespacedList.value ?? [])]
  })

  const infraProviderTypesList = computed(() => {
    return uniq(
      map(allCloudProfiles.value, profile => getCloudProfileSpec(profile).type)
        .filter(Boolean),
    )
  })

  const sortedInfraProviderTypeList = computed(() => {
    const infraProviderVendors = map(infraProviderTypesList.value, configStore.vendorDetails)
    const sortedVisibleInfraVendors = sortBy(infraProviderVendors, 'weight')
    return map(sortedVisibleInfraVendors, 'name')
  })

  function cloudProfilesByProviderType (providerType) {
    return sortBy(
      filter(allCloudProfiles.value, profile =>
        getCloudProfileSpec(profile).type === providerType,
      ),
      'metadata.name',
    )
  }

  /**
   * Resolves a cloudProfileRef to its full cloud profile object.
   *
   * Handles both:
   * - `{ kind: 'CloudProfile', name }` — looks up in the regular CloudProfile list
   * - `{ kind: 'NamespacedCloudProfile', name, namespace }` — looks up in the namespaced list
   *   by both name and namespace. If no namespace is provided in the ref, falls back to
   *   matching by name only (first match across all namespaces).
   *
   * @param {Object|null} cloudProfileRef
   * @returns {Object|null} The matching cloud profile object, or null if not found
   */
  function cloudProfileByRef (cloudProfileRef) {
    if (!cloudProfileRef) {
      return null
    }
    if (cloudProfileRef.kind === 'NamespacedCloudProfile') {
      if (cloudProfileRef.namespace) {
        return find(namespacedList.value, item =>
          item.metadata.name === cloudProfileRef.name &&
          item.metadata.namespace === cloudProfileRef.namespace,
        ) ?? null
      }
      // Fallback: only return when name is unique across namespaces
      const matches = filter(namespacedList.value, ['metadata.name', cloudProfileRef.name])
      return matches.length === 1 ? matches[0] : null
    }
    if (cloudProfileRef.kind === 'CloudProfile') {
      return find(list.value, ['metadata.name', cloudProfileRef.name]) ?? null
    }
    return null
  }

  return {
    list,
    namespacedList,
    isInitial,
    isNamespacedInitial,
    cloudProfileList,
    namespacedCloudProfileList,
    setCloudProfiles,
    setNamespacedCloudProfiles,
    fetchCloudProfiles,
    fetchNamespacedCloudProfiles,
    fetchNamespacedCloudProfilesForNamespaces,
    hasNamespacedCloudProfilesForNamespace,
    cloudProfilesByProviderType,
    sortedInfraProviderTypeList,
    cloudProfileByRef,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
