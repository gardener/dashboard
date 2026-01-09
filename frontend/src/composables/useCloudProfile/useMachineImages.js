//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
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
  getDistroFromImageName,
  findVendorHint,
} from '@/composables/helper.js'
import { useLogger } from '@/composables/useLogger.js'

import { normalizeVersion } from '@/utils/index.js'

import filter from 'lodash/filter'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
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

  /**
   * Flattens and processes machine images from cloud profile format.
   * Validates semver versions, normalizes where possible, and decorates with vendor information.
   * Sorts machine images by vendor weight and filters out hidden vendors.
   *
   * @param {Array} machineImages - Raw machine images from cloud profile spec
   * @returns {Array} Flattened array of decorated machine image objects
   */
  function flattenAndSortMachineImages (machineImages) {
    const machineImagesWithVendors = map(machineImages, machineImage => {
      const imageDistro = getDistroFromImageName(machineImage.name)
      const vendor = configStore.vendorDetails(imageDistro)
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

      return map(versions, ({ version, expirationDate, cri, classification, architectures }) => {
        if (isEmpty(architectures)) {
          architectures = ['amd64'] // default if not maintained
        }
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
          architectures,
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

  /**
   * Returns the default machine image for a given machine type based on architecture.
   * Selects the first matching version classification (typically latest supported version).
   *
   * @param {Ref<object>} architecture - A Vue ref containing the architecture
   * @returns {ComputedRef<object|undefined>} Computed ref with the default machine image or undefined
   * @throws {Error} If machineType is not a ref
   */
  function useDefaultMachineImage (architecture) {
    if (!isRef(architecture)) {
      throw new Error('architecture must be a ref!')
    }

    return computed(() => {
      const allMachineImages = machineImages.value
      const machineImagesForArchitecture = filter(allMachineImages, ({ architectures }) =>
        includes(architectures, architecture.value),
      )
      return firstItemMatchingVersionClassification(machineImagesForArchitecture)
    })
  }

  return {
    machineImages,
    useDefaultMachineImage,
  }
}
