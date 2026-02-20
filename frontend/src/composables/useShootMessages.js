//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useMachineImages } from '@/composables/useCloudProfile/useMachineImages'

import {
  isValidTerminationDate,
  machineImageHasUpdateForAutoUpdateStrategy,
  machineImageHasUpdate,
  machineVendorHasSupportedVersion,
  getVersionExpirationWarning,
  UNKNOWN_EXPIRED_TIMESTAMP,
} from '@/utils'

import map from 'lodash/map'
import compact from 'lodash/compact'
import find from 'lodash/find'
import get from 'lodash/get'

/**
 * Composable for shoot message validation and warnings
 * @param {Ref<CloudProfile>} cloudProfile - Vue ref containing the cloud profile object
 * @returns {Object} Object containing functions for shoot validation
 */
export function useShootMessages (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const { machineImages } = useMachineImages(cloudProfile)

  /**
   * Get expiring worker groups for shoot
   * @param {Ref<Array>} shootWorkerGroups - Vue ref containing worker groups
   * @param {Ref<Boolean>} imageAutoPatch - Vue ref indicating if auto-patch is enabled
   * @returns {ComputedRef<Array>} Computed ref of expiring worker groups
   */
  function useExpiringWorkerGroups (shootWorkerGroups, imageAutoPatch) {
    if (!isRef(shootWorkerGroups)) {
      throw new Error('shootWorkerGroups must be a ref!')
    }
    if (!isRef(imageAutoPatch)) {
      throw new Error('imageAutoPatch must be a ref!')
    }
    return computed(() => {
      const allMachineImages = machineImages.value

      const workerGroups = map(shootWorkerGroups.value, worker => {
        const workerImage = get(worker, ['machine', 'image'], {})
        const { name, version } = workerImage
        const workerImageDetails = find(allMachineImages, { name, version })

        if (!workerImageDetails) {
          return {
            ...workerImage,
            expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
            workerName: worker.name,
            isValidTerminationDate: false,
            severity: 'warning',
            supportedVersionAvailable: false,
            isExpired: true, // we treat it as expired
            regularUpdate: false,
            forcedUpdate: true, // probably expired so update will be enforced
            noUpdate: false,
          }
        }

        const updateAvailableForUpdateStrategy = machineImageHasUpdateForAutoUpdateStrategy(workerImageDetails, allMachineImages)
        const updateAvailable = machineImageHasUpdate(workerImageDetails, allMachineImages)
        const supportedVersionAvailable = machineVendorHasSupportedVersion(workerImageDetails, allMachineImages)
        const expirationWarning = getVersionExpirationWarning({
          isExpirationWarning: workerImageDetails.isExpirationWarning,
          autoPatchEnabled: imageAutoPatch.value,
          updateAvailable,
          autoUpdatePossible: updateAvailableForUpdateStrategy,
        })

        if (!expirationWarning) {
          return undefined
        }

        return {
          ...workerImageDetails,
          isValidTerminationDate: isValidTerminationDate(workerImageDetails.expirationDate),
          workerName: worker.name,
          supportedVersionAvailable,
          ...expirationWarning,
        }
      })

      return compact(workerGroups)
    })
  }

  return {
    useExpiringWorkerGroups,
  }
}
