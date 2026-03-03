//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

/**
 * Shared operation-status logic for resources exposing status.lastOperation
 */
export function useOperationStatus (lastOperation, hasErrors) {
  if (!isRef(lastOperation)) {
    throw new TypeError('First argument `lastOperation` must be a ref object')
  }
  if (!isRef(hasErrors)) {
    throw new TypeError('Second argument `hasErrors` must be a ref object')
  }

  const operationType = computed(() => {
    return lastOperation.value.type || 'Create'
  })

  const operationState = computed(() => {
    return lastOperation.value.state || 'Pending'
  })

  const showProgress = computed(() => {
    return operationState.value === 'Processing'
  })

  const isError = computed(() => {
    return operationState.value === 'Failed' || operationState.value === 'Error' || hasErrors.value
  })

  const isAborted = computed(() => {
    return operationState.value === 'Aborted'
  })

  const isPending = computed(() => {
    return operationState.value === 'Pending'
  })

  const isSucceeded = computed(() => {
    return operationState.value === 'Succeeded'
  })

  const isTypeCreate = computed(() => {
    return operationType.value === 'Create'
  })

  const baseStatusIcon = computed(() => {
    if (isTypeCreate.value && !isSucceeded.value) {
      return 'mdi-plus'
    }
    if (isError.value) {
      if (showProgress.value) {
        return 'mdi-exclamation'
      }
      return 'mdi-alert-outline'
    }
    return undefined
  })

  const baseColor = computed(() => {
    if (isAborted.value) {
      return 'unknown'
    }
    if (isError.value) {
      return 'error'
    }
    return 'primary'
  })

  const defaultLastMessage = computed(() => {
    return lastOperation.value.description || 'No description'
  })

  return {
    operationType,
    operationState,
    showProgress,
    isError,
    isAborted,
    isPending,
    isSucceeded,
    isTypeCreate,
    baseStatusIcon,
    baseColor,
    defaultLastMessage,
  }
}
