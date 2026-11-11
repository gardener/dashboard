//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

export function createGdchInfrastructureDetailsContext ({ manifest, networkingNodes }) {
  const parentReferenceName = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'name'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'name'], value)
    },
  })

  const parentReferenceNamespace = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'namespace'])
    },
    set (value) {
      if (value) {
        set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'namespace'], value)
      } else {
        unset(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'namespace'])
      }
    },
  })

  const parentReferenceType = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'type'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'parentReference', 'type'], value)
    },
  })

  const enableEgress = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'enableEgress'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'enableEgress'], value)
    },
  })

  const nodeCIDR = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'nodeCIDR'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'nodeCIDR'], value)
      networkingNodes.value = value
    },
  })

  return {
    parentReferenceName,
    parentReferenceNamespace,
    parentReferenceType,
    enableEgress,
    nodeCIDR,
    parentReferenceTypes: ['SingleSubnet', 'SubnetGroup'],
  }
}
