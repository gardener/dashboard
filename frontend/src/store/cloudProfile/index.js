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
import { useAppStore } from '@/store/app'

import { useApi } from '@/composables/useApi'

import { getCloudProfileSpec } from '@/utils'
import { computeSpecHash } from '@/utils/crypto'

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
  const appStore = useAppStore()

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
    await setNamespacedCloudProfiles(response.data, namespace)
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

  async function fetchCloudProfile (name) {
    const response = await api.getCloudProfile({ name })
    const updatedProfile = response.data
    const index = list.value?.findIndex(p => p.metadata.name === name) ?? -1
    if (index !== -1) {
      // eslint-disable-next-line security/detect-object-injection
      list.value[index] = updatedProfile
    } else {
      list.value = [...(list.value ?? []), updatedProfile]
    }
    return updatedProfile
  }

  function applyDiff (parentSpec, diff) {
    if (diff === null) {
      return cloneDeep(parentSpec)
    }
    return jsondiffpatchPatch(cloneDeep(parentSpec), diff)
  }

  async function rehydrateNamespacedProfiles (profiles) {
    if (!profiles) {
      return { profiles, droppedCount: 0 }
    }

    const rehydrated = []
    const refetchedParents = new Set()
    let droppedCount = 0

    for (const profile of profiles) {
      const {
        cloudProfileSpecDiff,
        parentCloudProfileResourceVersion,
        cloudProfileSpecHash: expectedHash,
      } = profile.status ?? {}

      if (!('cloudProfileSpecDiff' in (profile.status ?? {}))) {
        rehydrated.push(profile)
        continue
      }

      const parentName = profile.spec?.parent?.name
      const parent = find(list.value, ['metadata.name', parentName])
      if (!parent) {
        rehydrated.push(profile)
        continue
      }

      let rehydratedSpec = applyDiff(parent.spec, cloudProfileSpecDiff)

      if (expectedHash) {
        const actualHash = await computeSpecHash(rehydratedSpec)
        if (actualHash !== expectedHash) {
          const parentDrifted = parentCloudProfileResourceVersion &&
            parent.metadata?.resourceVersion !== parentCloudProfileResourceVersion

          if (!parentDrifted) {
            // eslint-disable-next-line no-console
            console.error(
              `Hash mismatch for NamespacedCloudProfile '${profile.metadata?.name}': ` +
              `rehydrated hash '${actualHash}' !== expected hash '${expectedHash}'. ` +
              'ResourceVersion matches, so re-fetch will not help. ' +
              'Dropping profile to prevent incorrect data.',
            )
            droppedCount++
            continue
          }

          let freshParent
          if (!refetchedParents.has(parentName)) {
            // eslint-disable-next-line no-console
            console.warn(
              `CloudProfile drift detected for parent '${parentName}': ` +
              `local resourceVersion '${parent.metadata?.resourceVersion}' !== ` +
              `backend resourceVersion '${parentCloudProfileResourceVersion}'. Re-fetching.`,
            )
            refetchedParents.add(parentName)
            try {
              freshParent = await fetchCloudProfile(parentName)
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(
                `Failed to re-fetch CloudProfile '${parentName}'. ` +
                `Dropping NamespacedCloudProfile '${profile.metadata?.name}' to prevent incorrect data.`,
                err,
              )
              droppedCount++
              continue
            }
          } else {
            freshParent = find(list.value, ['metadata.name', parentName])
          }

          if (!freshParent) {
            droppedCount++
            continue
          }

          rehydratedSpec = applyDiff(freshParent.spec, cloudProfileSpecDiff)
          const retryHash = await computeSpecHash(rehydratedSpec)
          if (retryHash !== expectedHash) {
            // eslint-disable-next-line no-console
            console.error(
              `Hash mismatch for NamespacedCloudProfile '${profile.metadata?.name}' ` +
              'persists after parent re-fetch: ' +
              `rehydrated hash '${retryHash}' !== expected hash '${expectedHash}'. ` +
              'Dropping profile to prevent incorrect data.',
            )
            droppedCount++
            continue
          }
        }
      }

      profile.status.cloudProfileSpec = rehydratedSpec
      delete profile.status.cloudProfileSpecDiff
      delete profile.status.parentCloudProfileResourceVersion
      delete profile.status.cloudProfileSpecHash
      rehydrated.push(profile)
    }

    return { profiles: rehydrated, droppedCount }
  }

  async function setNamespacedCloudProfiles (namespacedCloudProfiles, namespace) {
    if (!namespace) {
      throw new TypeError('namespace is required')
    }
    const { profiles: rehydrated, droppedCount } = await rehydrateNamespacedProfiles(namespacedCloudProfiles)
    namespacedListsByNamespace.value = {
      ...namespacedListsByNamespace.value,
      [namespace]: rehydrated,
    }
    namespacedList.value = flatten(Object.values(namespacedListsByNamespace.value))

    if (droppedCount > 0) {
      appStore.setError({
        title: 'Cloud Profile Sync Error',
        text: `${droppedCount} namespaced cloud profile(s) were excluded due to data inconsistency. Try refreshing the page.`,
      })
    }
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
