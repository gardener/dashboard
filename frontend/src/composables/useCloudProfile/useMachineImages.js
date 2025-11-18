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
  decorateClassificationObject,
  firstItemMatchingVersionClassification,
  vendorNameFromImageName,
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
   *
   * @param {Array} machineImages - Raw machine images from cloud profile spec
   * @returns {Array} Flattened array of decorated machine image objects
   */
  function flattenMachineImages (machineImages) {
    return flatMap(machineImages, machineImage => {
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

      const vendorName = vendorNameFromImageName(name)
      const vendorHint = findVendorHint(configStore.vendorHints, vendorName)

      return map(versions, ({ version, expirationDate, cri, classification, architectures }) => {
        if (isEmpty(architectures)) {
          architectures = ['amd64'] // default if not maintained
        }
        return decorateClassificationObject({
          key: name + '/' + version,
          name,
          version,
          updateStrategy,
          cri,
          classification,
          expirationDate,
          vendorName,
          icon: vendorName,
          vendorHint,
          architectures,
        })
      })
    })
  }

  /**
   * Returns all machine images from the cloud profile, flattened and decorated.
   */
  const machineImages = computed(() => {
    const rawImages = get(cloudProfile.value, ['spec', 'machineImages'], [])
    return flattenMachineImages(rawImages)
  })

  /**
   * Returns the default machine image for a given machine type based on architecture.
   * Selects the first matching version classification (typically latest supported version).
   *
   * @param {Ref<object>} machineType - A Vue ref containing the machine type object with architecture
   * @returns {ComputedRef<object|undefined>} Computed ref with the default machine image or undefined
   * @throws {Error} If machineType is not a ref
   */
  function useDefaultMachineImage (machineType) {
    if (!isRef(machineType)) {
      throw new Error('machineType must be a ref!')
    }

    return computed(() => {
      const allMachineImages = machineImages.value
      const machineImagesForArchitecture = filter(allMachineImages, ({ architectures }) =>
        includes(architectures, machineType.value?.architecture),
      )
      return firstItemMatchingVersionClassification(machineImagesForArchitecture)
    })
  }

  return {
    machineImages,
    useDefaultMachineImage,
  }
}
