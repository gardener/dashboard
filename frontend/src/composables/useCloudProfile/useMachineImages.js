//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import semver from 'semver'
import {
  computed,
  isRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import {
  addClassificationHelpers,
  firstItemMatchingVersionClassification,
  findVendorHint,
} from '@/composables/helper.js'
import { useLogger } from '@/composables/useLogger.js'
import {
  useMachineCapabilities,
  resolveArchitectures,
} from '@/composables/useCloudProfile/useMachineCapabilities.js'

import { normalizeVersion } from '@/utils/index.js'

import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import sortBy from 'lodash/sortBy'

/**
 * @typedef {import('vue').ComputedRef} ComputedRef
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Composable for managing machine image information from a cloud profile.
 * Provides functionality for working with machine images including version handling,
 * expiration tracking, and update availability checking for worker groups.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @throws {Error} If cloudProfile is not a ref
 */
export function useMachineImages (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const logger = useLogger()
  const configStore = useConfigStore()
  const machineCapabilities = useMachineCapabilities(cloudProfile)

  /**
   * Flattens and processes machine images from cloud profile format.
   * Validates semver versions, normalizes where possible, and decorates with vendor information.
   * Sorts machine images by vendor weight.
   *
   * @param {Array} machineImages - Raw machine images from cloud profile spec
   * @returns {Array} Flattened array of decorated machine image objects
   */
  function flattenAndSortMachineImages (machineImages) {
    const machineImagesWithVendors = map(machineImages, machineImage => {
      const vendor = configStore.vendorDetails({
        type: 'machineImage',
        name: machineImage.name,
      })
      return {
        ...machineImage,
        vendor,
      }
    })
    const sortedMachineImagesWithVendors = sortBy(machineImagesWithVendors, 'vendor.weight')

    return flatMap(sortedMachineImagesWithVendors, machineImage => {
      const { name, updateStrategy = 'major' } = machineImage

      const versions = []
      for (const versionObj of machineImage.versions) {
        if (semver.valid(versionObj.version)) {
          versions.push(versionObj)
          continue
        }

        const normalizedVersion = normalizeVersion(versionObj.version)
        if (normalizedVersion) {
          versionObj.version = normalizedVersion
          versions.push(versionObj)
          continue
        }

        logger.warn(`Skipped machine image ${name} as version ${versionObj.version} is not a valid semver version and cannot be normalized`)
      }
      versions.sort((a, b) => {
        return semver.rcompare(a.version, b.version)
      })

      const vendorName = machineImage.vendor.name
      const icon = machineImage.vendor.icon
      const displayName = machineImage.vendor.displayName || machineImage.name
      const vendorHint = findVendorHint(configStore.vendorHints, machineImage.vendor.name)
      const hidden = Boolean(machineImage.vendor.hidden)

      return map(versions, ({ version, expirationDate, cri, classification, architectures, capabilityFlavors }) => {
        const image = {
          key: name + '/' + version,
          name,
          vendorName,
          icon,
          displayName,
          version,
          updateStrategy,
          cri,
          classification,
          expirationDate,
          vendorHint,
          hidden,
          architectures,
          capabilityFlavors,
        }
        return addClassificationHelpers(image)
      })
    })
  }

  /**
   * Returns all machine images from the cloud profile, flattened and decorated.
   */
  const machineImages = computed(() => {
    const rawImages = get(cloudProfile.value, ['spec', 'machineImages'], [])
    return flattenAndSortMachineImages(rawImages)
  })

  function useFilteredMachineImages (machineType) {
    function matchesMachineTypeCapabilities (machineImage, machineType) {
      const capabilities = machineType?.capabilities
      if (!machineImage.capabilityFlavors) {
        // No capabilityFlavors: fall back to architecture check
        const architectures = resolveArchitectures(machineType, machineCapabilities.value)
        if (architectures.length) {
          return architectures.some(arch => includes(machineImage.architectures, arch))
        }
        return true
      }
      return machineImage.capabilityFlavors.some(capabilityFlavor => {
        return Object.entries(capabilityFlavor).every(([name, values]) => {
          return values?.some(value => {
            const capability = get(capabilities, [name])
            return capability?.includes(value) ||
            (!capability && get(machineCapabilities.value, [name])?.includes(value)) // Fallback to default Machine capabilities if MachineType capabilities do not exist
          })
        })
      })
    }

    return machineImages.value.filter(machineImage => {
      return machineImage &&
        !machineImage.isExpired &&
        !machineImage.hidden &&
        matchesMachineTypeCapabilities(machineImage, machineType)
    })
  }

  /**
   * Returns the default machine image for a given machine type.
   * Selects the first matching version classification (typically latest supported version).
   *
   * @param {Ref<object>} machineType - A Vue ref containing the machineType
   * @returns {ComputedRef<object|undefined>} Computed ref with the default machine image or undefined
   * @throws {Error} If machineType is not a ref
   */
  function useDefaultMachineImage (machineType) {
    if (!isRef(machineType)) {
      throw new Error('architecture must be a ref!')
    }

    return computed(() => {
      const machineImagesMachineType = useFilteredMachineImages(machineType.value)
      return firstItemMatchingVersionClassification(machineImagesMachineType)
    })
  }

  return {
    machineImages,
    useDefaultMachineImage,
    useFilteredMachineImages,
  }
}
