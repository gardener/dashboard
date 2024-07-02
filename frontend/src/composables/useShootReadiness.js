//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
} from 'vue'

import { useAuthnStore } from '@/store/authn'

import { objectsFromErrorCodes } from '@/utils/errorCodes'

import {
  isEmpty,
  upperFirst,
} from '@/lodash'

export function useShootReadiness (condition, staleShoot = false, shootMetadata) {
  const authnStore = useAuthnStore()

  const isAdmin = computed(() => authnStore.isAdmin)

  const isError = computed(() => {
    if (condition.status === 'False' || !isEmpty(condition.codes)) {
      return true
    }
    return false
  })

  const isUnknown = computed(() => {
    if (condition.status === 'Unknown') {
      return true
    }
    return false
  })

  const isProgressing = computed(() => {
    if (condition.status === 'Progressing') {
      return true
    }
    return false
  })

  const errorDescriptions = computed(() => {
    if (isError.value) {
      return [
        {
          description: condition.message,
          errorCodeObjects: objectsFromErrorCodes(condition.codes),
        },
      ]
    }
    return undefined
  })

  const status = computed(() => {
    if (isUnknown.value || staleShoot) {
      return 'unknown'
    }
    if (isError.value) {
      return 'error'
    }
    if (isProgressing.value) {
      return 'progressing'
    }
    return 'healthy'
  })

  const popoverKey = computed(() => {
    return `g-readiness-chip[${condition.type}]:${shootMetadata.uid}`
  })

  const popperTitle = computed(() => {
    if (staleShoot) {
      return 'Last Status'
    }
    return condition.name
  })

  const statusTitle = computed(() => {
    return upperFirst(status.value)
  })

  const nonErrorMessage = computed(() => {
    if (!isError.value) {
      return condition.message
    }
    return undefined
  })

  const color = computed(() => {
    if (status.value === 'progressing') {
      if (isAdmin.value) {
        return 'info'
      }
      return 'primary'
    }
    if (status.value === 'healthy') {
      return 'primary'
    }
    return status.value
  })

  const activePopoverKey = inject('activePopoverKey')

  const internalPopoverValue = computed({
    get () {
      return activePopoverKey?.value === popoverKey.value
    },
    set (value) {
      activePopoverKey.value = value ? popoverKey.value : ''
    },
  })

  return {
    isError,
    isUnknown,
    isProgressing,
    errorDescriptions,
    status,
    popoverKey,
    popperTitle,
    statusTitle,
    nonErrorMessage,
    color,
    internalPopoverValue,
  }
}
