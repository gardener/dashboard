//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import { useOpenStackConstraints } from '@/providers/infra/openstack/cloudProfile'
import {
  bestMatchForString,
  wildcardObjectsFromStrings,
} from '@/utils/wildcard'

import get from 'lodash/get'
import head from 'lodash/head'
import includes from 'lodash/includes'
import set from 'lodash/set'

export function createOpenstackInfrastructureDetailsContext ({
  manifest,
  region,
  cloudProfile,
  infrastructureBinding,
  configStore,
}) {
  const { credential } = useCloudProviderBinding(infrastructureBinding)
  const {
    useOpenStackFloatingPoolNames,
    useOpenStackLoadBalancerProviderNames,
  } = useOpenStackConstraints(cloudProfile)

  const allLoadBalancerProviderNames = useOpenStackLoadBalancerProviderNames(region)
  const allFloatingPoolNames = useOpenStackFloatingPoolNames(region, credential)

  const loadBalancerProviderName = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerProvider'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerProvider'], value)
    },
  })

  const floatingPoolName = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'], value)
    },
  })

  function resetRegionDependentValues () {
    const configuredLoadBalancerProvider = configStore.defaultLoadBalancerProvider
    loadBalancerProviderName.value = includes(allLoadBalancerProviderNames.value, configuredLoadBalancerProvider)
      ? configuredLoadBalancerProvider
      : head(allLoadBalancerProviderNames.value)

    const configuredFloatingPool = configStore.defaultFloatingPool
    const floatingPoolPatterns = wildcardObjectsFromStrings(allFloatingPoolNames.value)
    const configuredFloatingPoolMatches = configuredFloatingPool && bestMatchForString(floatingPoolPatterns, configuredFloatingPool)
    floatingPoolName.value = configuredFloatingPoolMatches
      ? configuredFloatingPool
      : head(allFloatingPoolNames.value)
  }

  return {
    loadBalancerProviderName,
    floatingPoolName,
    allLoadBalancerProviderNames,
    allFloatingPoolNames,
    resetRegionDependentValues,
  }
}
