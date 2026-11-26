//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
  provide,
  ref,
  shallowRef,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { useObjectMetadata } from '@/composables/useObjectMetadata'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

const API_VERSION = 'security.gardener.cloud/v1alpha1'

export function createWorkloadIdentityContextComposable (options = {}) {
  const authzStore = options.authzStore ?? useAuthzStore()
  const initialManifest = shallowRef(null)
  const manifest = ref({})
  const isCreateMode = ref(true)
  // Return a defensive clone for API submission. Empty objects, arrays and
  // nulls can be meaningful in provider configuration and are preserved.
  const workloadIdentityManifest = computed(() => cloneDeep(manifest.value))

  function setWorkloadIdentityManifest (value) {
    isCreateMode.value = false
    initialManifest.value = cloneDeep(value)
    manifest.value = cloneDeep(value)
  }

  function createWorkloadIdentityManifest ({
    name = '',
    labels = {},
    workloadIdentityConfig = {},
  } = {}) {
    isCreateMode.value = true
    const namespace = options.namespace ?? authzStore.namespace
    const targetSystem = {
      type: workloadIdentityConfig.targetSystemType,
    }
    if (!workloadIdentityConfig.omitProviderConfig) {
      targetSystem.providerConfig = cloneDeep(workloadIdentityConfig.providerConfigDefaults ?? {})
    }
    manifest.value = {
      apiVersion: API_VERSION,
      kind: 'WorkloadIdentity',
      metadata: { name, namespace, ...(Object.keys(labels).length ? { labels: cloneDeep(labels) } : {}) },
      spec: {
        audiences: cloneDeep(workloadIdentityConfig.audiencesDefault ?? ['']),
        targetSystem,
      },
    }
    const defaultValues = Object.fromEntries((workloadIdentityConfig.fields ?? [])
      .filter(field => field.defaultValue !== undefined)
      .map(field => [field.key, field.defaultValue]))
    setWorkloadIdentityFieldValues(workloadIdentityConfig.fields, defaultValues)
    initialManifest.value = cloneDeep(manifest.value)
  }

  const {
    name: workloadIdentityName,
    namespace: workloadIdentityNamespace,
  } = useObjectMetadata(manifest)

  const audiences = computed({
    get: () => get(manifest.value, ['spec', 'audiences'], []),
    set: value => set(manifest.value, ['spec', 'audiences'], value),
  })

  const providerConfig = computed({
    get: () => get(manifest.value, ['spec', 'targetSystem', 'providerConfig']),
    set: value => {
      if (value === undefined) {
        unset(manifest.value, ['spec', 'targetSystem', 'providerConfig'])
      } else {
        set(manifest.value, ['spec', 'targetSystem', 'providerConfig'], value)
      }
    },
  })

  const dnsProviderType = computed({
    get: () => get(manifest.value, ['metadata', 'labels', 'dashboard.gardener.cloud/dnsProviderType']),
    set: value => set(manifest.value, ['metadata', 'labels', 'dashboard.gardener.cloud/dnsProviderType'], value),
  })

  function fieldPath (field) {
    return Array.isArray(field.path) ? field.path : [field.key]
  }

  function getWorkloadIdentityFieldValues (fields = []) {
    const config = providerConfig.value ?? {}
    return Object.fromEntries(fields
      .map(field => [field.key, cloneDeep(get(config, fieldPath(field)))])
      .filter(([, value]) => value !== undefined))
  }

  function setWorkloadIdentityFieldValues (fields = [], values = {}) {
    if (!fields.length) {
      return
    }
    const nextConfig = cloneDeep(providerConfig.value ?? {})
    for (const field of fields) {
      if ((!isCreateMode.value && field.immutableOnEdit) || !Object.hasOwn(values, field.key)) {
        continue
      }
      const value = cloneDeep(values[field.key])
      if (value === undefined || (field.omitWhenEmpty && value === '')) {
        unset(nextConfig, fieldPath(field))
      } else {
        set(nextConfig, fieldPath(field), value)
      }
    }
    providerConfig.value = nextConfig
  }

  function validateProviderConfig (workloadIdentityConfig = {}) {
    if (workloadIdentityConfig.omitProviderConfig) {
      return providerConfig.value === undefined
        ? []
        : ['Provider configuration must be omitted for this target system']
    }
    return workloadIdentityConfig.validateProviderConfig?.(providerConfig.value) ?? []
  }

  return {
    initialWorkloadIdentityManifest: initialManifest,
    workloadIdentityManifest,
    setWorkloadIdentityManifest,
    createWorkloadIdentityManifest,
    workloadIdentityName,
    workloadIdentityNamespace,
    audiences,
    providerConfig,
    dnsProviderType,
    getWorkloadIdentityFieldValues,
    setWorkloadIdentityFieldValues,
    validateProviderConfig,
  }
}

export function useWorkloadIdentityContext () {
  return inject('workload-identity-context', null)
}

export function useProvideWorkloadIdentityContext (options) {
  const composable = createWorkloadIdentityContextComposable(options)
  provide('workload-identity-context', composable)
  return composable
}
