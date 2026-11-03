//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  maxLength,
  minValue,
  required,
  requiredIf,
} from '@vuelidate/validators'

import { useShootContext } from '@/composables/useShootContext'
import { getWorkerMinimumVolumeSizeGi } from '@/composables/useCloudProfile/useVolumeTypes'

import { convertToGi } from '@/utils'
import {
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
  numberOrPercentage,
  withFieldMetadata,
  withMessage,
  withParams,
} from '@/utils/validators'

function workerGroupContext (worker) {
  return worker.name ? `Worker Group ${worker.name}` : 'Worker Group'
}

export function useWorkersValidation () {
  const {
    providerWorkers,
    workerless,
    isZonedCluster,
    providerType,
    cloudProfile,
    allMachineTypes,
    volumeTypes,
  } = useShootContext()

  const hasVolumeTypes = () => Boolean(volumeTypes.value?.length)
  const isAWS = () => providerType.value === 'aws' || cloudProfile.value?.spec?.type === 'aws'
  const isZonedClusterRequired = () => isZonedCluster.value
  const workers = computed(() => workerless.value ? [] : providerWorkers.value)
  const workerIopsRequirementByWorker = new WeakMap()

  function getMinimumVolumeSizeGi (worker) {
    return getWorkerMinimumVolumeSizeGi(
      worker,
      allMachineTypes.value,
      cloudProfile.value?.spec?.volumeTypes ?? [],
    )
  }

  function getIsWorkerIopsRequired (worker) {
    if (!workerIopsRequirementByWorker.has(worker)) {
      workerIopsRequirementByWorker.set(worker, () => {
        return isAWS() && (worker.volume?.type === 'io1' || worker.volume?.type === 'io2')
      })
    }
    return workerIopsRequirementByWorker.get(worker)
  }

  function createWorkerValidationRules (worker) {
    const fieldContext = computed(() => workerGroupContext(worker))
    const withWorkerFieldMetadata = (fieldName, validators) => withFieldMetadata({
      fieldName,
      fieldContext,
    }, validators)
    const uniqueWorkerName = withMessage('Worker name must be unique', withParams(
      { type: 'uniqueWorkerName' },
      value => providerWorkers.value.filter(item => item.name === value).length === 1,
    ))

    return {
      name: withWorkerFieldMetadata('Name', {
        required,
        maxLength: maxLength(15),
        lowerCaseAlphaNumHyphen,
        noStartEndHyphen,
        uniqueWorkerName,
      }),
      minimum: withWorkerFieldMetadata('Autoscaler Min.', {
        minValue: minValue(0),
      }),
      maximum: withWorkerFieldMetadata('Autoscaler Max.', {
        minValue: minValue(0),
        systemComponents: withMessage(
          'Value must be greater or equal to the number of zones configured for this pool',
          value => worker.systemComponents?.allow === false || value >= (worker.zones?.length ?? 0),
        ),
      }),
      maxSurge: withWorkerFieldMetadata('Max. Surge', {
        numberOrPercentage,
      }),
      zones: withWorkerFieldMetadata('Zones', {
        required: requiredIf(isZonedClusterRequired),
      }),
      machine: {
        architecture: withWorkerFieldMetadata('Machine Architecture', {
          required,
        }),
        type: withWorkerFieldMetadata('Machine Type', {
          required,
        }),
        image: withWorkerFieldMetadata('Machine Image', {
          required,
        }),
      },
      cri: {
        name: withWorkerFieldMetadata('Container Runtime', {
          required,
        }),
      },
      volume: {
        type: withWorkerFieldMetadata('Volume Type', {
          required: requiredIf(hasVolumeTypes),
        }),
        size: withWorkerFieldMetadata('Volume Size', {
          minVolumeSize: withMessage(
            () => `Minimum size is ${getMinimumVolumeSizeGi(worker)}`,
            value => {
              const hasVolumeSize = hasVolumeTypes() || Boolean(worker.volume)
              return !hasVolumeSize || (
                Boolean(value) && getMinimumVolumeSizeGi(worker) <= convertToGi(value)
              )
            },
          ),
        }),
      },
      providerConfig: {
        volume: {
          iops: withWorkerFieldMetadata('Volume Type IOPS', {
            required: requiredIf(getIsWorkerIopsRequired(worker)),
            minValue: minValue(100),
          }),
        },
      },
    }
  }

  const validationState = computed(() => Object.fromEntries(
    workers.value.map(worker => [worker._uid, worker]),
  ))
  const validationRules = computed(() => Object.fromEntries(
    workers.value.map(worker => [worker._uid, createWorkerValidationRules(worker)]),
  ))

  return useVuelidate(validationRules, validationState)
}
