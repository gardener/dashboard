//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import get from 'lodash/get'
import find from 'lodash/find'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import template from 'lodash/template'

/**
 * Composable for managing access restrictions from a cloud profile.
 * Provides functions for working with access restrictions by region,
 * including definitions and no-items text.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @throws {Error} If cloudProfile is not a ref
 */
export function useCloudProfileForAccessRestrictions (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const configStore = useConfigStore()

  /**
   * Returns access restrictions available for a given region.
   * Reads from the cloud profile's regions configuration to find region-specific
   * access restrictions.
   *
   * @param {Ref<string>} region - A Vue ref containing the region name
   * @returns {ComputedRef<Array>} Computed ref with array of access restrictions, or empty array if none found
   * @throws {Error} If region is not a ref
   */
  function accessRestrictionsByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      if (!cloudProfile.value) {
        return []
      }

      const regionData = find(cloudProfile.value?.spec.regions, ['name', region.value])
      if (!regionData) {
        return []
      }
      return get(regionData, ['accessRestrictions'], [])
    })
  }

  /**
   * Returns access restriction definitions for a given region.
   * Filters the configured access restriction items based on what's allowed in the region.
   *
   * @param {Ref<string>} region - A Vue ref containing the region name
   * @returns {ComputedRef<Array>} Computed ref with array of access restriction definitions, or empty array if none
   * @throws {Error} If region is not a ref
   */
  function accessRestrictionDefinitionsByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      if (!region.value) {
        return []
      }

      const allowedAccessRestrictions = accessRestrictionsByRegion(region).value
      if (isEmpty(allowedAccessRestrictions)) {
        return []
      }

      const allowedAccessRestrictionNames = allowedAccessRestrictions.map(ar => ar.name)

      const items = get(configStore, ['accessRestriction', 'items'])
      return filter(items, ({ key }) => {
        return key && allowedAccessRestrictionNames.includes(key)
      })
    })
  }

  /**
   * Returns the no-items text for access restrictions in a given region.
   * Uses a template from config that can be customized with region and cloud profile information.
   *
   * @param {Ref<string>} region - A Vue ref containing the region name
   * @returns {ComputedRef<string>} Computed ref with the no-items text message
   * @throws {Error} If region is not a ref
   */
  function accessRestrictionNoItemsTextByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      const defaultNoItemsText = 'No access restriction options available for region ${region}' // eslint-disable-line no-template-curly-in-string
      const noItemsText = get(configStore, ['accessRestriction', 'noItemsText'], defaultNoItemsText)

      return template(noItemsText)({
        region: region.value,
        cloudProfileName: cloudProfile.value?.metadata?.name,
        cloudProfileKind: cloudProfile.value?.kind,
        cloudProfile: cloudProfile.value?.metadata?.name, // deprecated
      })
    })
  }

  return {
    accessRestrictionsByRegion,
    accessRestrictionDefinitionsByRegion,
    accessRestrictionNoItemsTextByRegion,
  }
}
