//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { matchesPropertyOrEmpty } from '@/composables/helper'

import { getOpenStackCredentialDomainName } from '@/providers/infra/openstack/credentials'

import get from 'lodash/get'
import filter from 'lodash/filter'
import find from 'lodash/find'
import map from 'lodash/map'
import uniq from 'lodash/uniq'

/**
 * Provider-owned composable for managing OpenStack-specific constraints from a cloud profile.
 * Provides functions for working with floating pools and load balancer providers
 * specific to OpenStack infrastructure.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @throws {Error} If cloudProfile is not a ref
 */
export function useOpenStackConstraints (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  /**
   * Returns floating pools filtered by region and domain.
   * Handles regional and domain-specific constraints, including non-constraining pools.
   *
   * @param {Ref<string>} region - A Vue ref containing the region
   * @param {Ref<object>} credential - A Vue ref containing the OpenStack credential
   * @returns {ComputedRef<Array>} Computed ref with available floating pools
   * @throws {Error} If region or credential are not refs
   */
  function useOpenStackFloatingPools (region, credential) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }
    if (!isRef(credential)) {
      throw new Error('credential must be a ref!')
    }

    return computed(() => {
      const secretDomain = getOpenStackCredentialDomainName(credential.value)
      const floatingPools = get(cloudProfile.value, ['spec', 'providerConfig', 'constraints', 'floatingPools'])
      let availableFloatingPools = filter(floatingPools, matchesPropertyOrEmpty('region', region.value))
      availableFloatingPools = filter(availableFloatingPools, matchesPropertyOrEmpty('domain', secretDomain))

      const hasRegionSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.region && !fp.nonConstraining)
      if (hasRegionSpecificFloatingPool) {
        availableFloatingPools = filter(availableFloatingPools, { region: region.value })
      }
      const hasDomainSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.domain && !fp.nonConstraining)
      if (hasDomainSpecificFloatingPool) {
        availableFloatingPools = filter(availableFloatingPools, { domain: secretDomain })
      }

      return availableFloatingPools
    })
  }

  /**
   * Returns floating pool names filtered by region and domain.
   *
   * @param {Ref<string>} region - A Vue ref containing the region
   * @param {Ref<object>} credential - A Vue ref containing the OpenStack credential
   * @returns {ComputedRef<Array<string>>} Computed ref with unique floating pool names
   * @throws {Error} If region or credential are not refs
   */
  function useOpenStackFloatingPoolNames (region, credential) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }
    if (!isRef(credential)) {
      throw new Error('credential must be a ref!')
    }

    const floatingPools = useOpenStackFloatingPools(region, credential)

    return computed(() => {
      return uniq(map(floatingPools.value, 'name'))
    })
  }

  /**
   * Returns load balancer provider names filtered by region.
   *
   * @param {Ref<string>} region - A Vue ref containing the region
   * @returns {ComputedRef<Array<string>>} Computed ref with unique load balancer provider names
   * @throws {Error} If region is not a ref
   */
  function useOpenStackLoadBalancerProviderNames (region) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }

    return computed(() => {
      const loadBalancerProviders = get(cloudProfile.value, ['spec', 'providerConfig', 'constraints', 'loadBalancerProviders'])
      let availableLoadBalancerProviders = filter(loadBalancerProviders, matchesPropertyOrEmpty('region', region.value))
      const hasRegionSpecificLoadBalancerProvider = find(availableLoadBalancerProviders, lb => !!lb.region)
      if (hasRegionSpecificLoadBalancerProvider) {
        availableLoadBalancerProviders = filter(availableLoadBalancerProviders, { region: region.value })
      }
      return uniq(map(availableLoadBalancerProviders, 'name'))
    })
  }

  return {
    useOpenStackFloatingPools,
    useOpenStackFloatingPoolNames,
    useOpenStackLoadBalancerProviderNames,
  }
}
