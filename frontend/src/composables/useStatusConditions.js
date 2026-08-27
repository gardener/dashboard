//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import padStart from 'lodash/padStart'
import sortBy from 'lodash/sortBy'
import isEmpty from 'lodash/isEmpty'

export const CONDITION_STATES = Object.freeze({
  ERROR: 'error',
  UNKNOWN: 'unknown',
  PROGRESSING: 'progressing',
  HEALTHY: 'healthy',
})

export function conditionState (condition) {
  if (condition?.status === 'False' || !isEmpty(condition?.codes)) {
    return CONDITION_STATES.ERROR
  }
  if (condition?.status === 'Unknown') {
    return CONDITION_STATES.UNKNOWN
  }
  if (condition?.status === 'Progressing') {
    return CONDITION_STATES.PROGRESSING
  }
  return CONDITION_STATES.HEALTHY
}

export function isConditionHealthy (condition) {
  return conditionState(condition) === CONDITION_STATES.HEALTHY
}

export function useStatusConditions (rawConditionsRef) {
  if (!isRef(rawConditionsRef)) {
    throw new TypeError('First argument `rawConditionsRef` must be a ref object')
  }

  const configStore = useConfigStore()

  const conditions = computed(() => {
    if (!rawConditionsRef.value) {
      return []
    }

    const normalized = rawConditionsRef.value
      .filter(condition => !!condition.lastTransitionTime)
      .map(condition => {
        const conditionDefaults = configStore.conditionForType(condition.type)
        return {
          ...conditionDefaults,
          ...condition,
          sortOrder: padStart(conditionDefaults.sortOrder, 8, '0'),
        }
      })

    return sortBy(normalized, 'sortOrder')
  })

  const errorCodeObjects = computed(() => {
    const allErrorCodes = errorCodesFromArray(conditions.value)
    return objectsFromErrorCodes(allErrorCodes)
  })

  return {
    conditions,
    errorCodeObjects,
  }
}
