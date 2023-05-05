//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBrowserLocation } from '@vueuse/core'
import { useApi } from '@/composables'
import { useAuthzStore } from './authz'
import { Shortcut, filterShortcuts } from './helper'

import { TargetEnum } from '@/utils'
import { hash } from '@/utils/crypto'

import camelCase from 'lodash/camelCase'
import get from 'lodash/get'
import map from 'lodash/map'
import uniqBy from 'lodash/uniqBy'

export const useConfigStore = defineStore('config', () => {
  const api = useApi()
  const location = useBrowserLocation()
  const authzStore = useAuthzStore()

  const state = ref(null)

  const isInitial = computed(() => {
    return state.value === null
  })

  const alert = computed(() => {
    return state.value?.alert
  })

  const accessRestriction = computed(() => {
    return state.value?.accessRestriction
  })

  const sla = computed(() => {
    return state.value?.sla
  })

  const costObject = computed(() => {
    return state.value?.costObject
  })

  const features = computed(() => {
    return state.value?.features
  })

  const knownConditions = computed(() => {
    return state.value?.knownConditions
  })

  const resourceQuotaHelp = computed(() => {
    return state.value?.resourceQuotaHelp
  })

  const controlPlaneHighAvailabilityHelp = computed(() => {
    return state.value?.controlPlaneHighAvailabilityHelp
  })

  const defaultHibernationSchedule = computed(() => {
    return state.value?.defaultHibernationSchedule
  })

  const themes = computed(() => {
    return state.value?.themes
  })

  const terminal = computed(() => {
    return state.value?.terminal
  })

  const ticket = computed(() => {
    return state.value?.ticket
  })

  const vendorHints = computed(() => {
    return state.value?.vendorHints ?? []
  })

  const helpMenuItems = computed(() => {
    return state.value?.helpMenuItems ?? []
  })

  const externalTools = computed(() => {
    return state.value?.externalTools ?? []
  })

  const defaultNodesCIDR = computed(() => {
    return state.value?.defaultNodesCIDR ?? '10.250.0.0/16'
  })

  const apiServerUrl = computed(() => {
    return state.value?.apiServerUrl ?? location.origin
  })

  const clusterIdentity = computed(() => {
    return state.value?.clusterIdentity
  })

  const seedCandidateDeterminationStrategy = computed(() => {
    return state.value?.seedCandidateDeterminationStrategy
  })

  const serviceAccountDefaultTokenExpiration = computed(() => {
    return state.value?.serviceAccountDefaultTokenExpiration ?? 0
  })

  const isTerminalEnabled = computed(() => {
    return features.value?.terminalEnabled === true
  })

  const isProjectTerminalShortcutsEnabled = computed(() => {
    return features.value?.projectTerminalShortcutsEnabled === true
  })

  const alertBannerMessage = computed(() => {
    return alert.value?.message
  })

  const alertBannerType = computed(() => {
    return alert.value?.type ?? 'error'
  })

  const alertBannerIdentifier = computed(() => {
    if (!alertBannerMessage.value) {
      return
    }
    let identifier = alert.value?.identifier
    if (identifier) {
      identifier = camelCase(identifier)
    } else {
      identifier = hash(alertBannerMessage.value)
    }
    // we prefix the identifier coming from the configuration so that they do not clash with our internal identifiers (e.g. for the shoot editor warning)
    return `cfg.${identifier}`
  })

  const costObjectSettings = computed(() => {
    const costObject = state.value?.costObject
    if (!costObject) {
      return undefined
    }

    const title = costObject.title || ''
    const description = costObject.description || ''
    const regex = costObject.regex
    const errorMessage = costObject.errorMessage

    return {
      regex,
      title,
      description,
      errorMessage,
    }
  })

  const appVersion = computed(() => {
    return state.value?.appVersion ?? import.meta.env.VITE_APP_VERSION
  })

  async function fetchConfig () {
    const response = await api.getConfiguration()
    state.value = response.data
  }

  async function $reset () {
    state.value = null
  }

  function getTerminalShortcuts (targetsFilter = [TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE, TargetEnum.GARDEN]) {
    let shortcuts = get(state.value, 'terminal.shortcuts', [])
    shortcuts = map(shortcuts, shortcut => new Shortcut(shortcut, false))
    shortcuts = uniqBy(shortcuts, 'id')
    return filterShortcuts(authzStore, { shortcuts, targetsFilter })
  }

  return {
    isInitial,
    appVersion,
    alert,
    accessRestriction,
    sla,
    costObject,
    features,
    knownConditions,
    resourceQuotaHelp,
    controlPlaneHighAvailabilityHelp,
    defaultHibernationSchedule,
    themes,
    terminal,
    ticket,
    vendorHints,
    helpMenuItems,
    externalTools,
    defaultNodesCIDR,
    apiServerUrl,
    clusterIdentity,
    seedCandidateDeterminationStrategy,
    serviceAccountDefaultTokenExpiration,
    isTerminalEnabled,
    isProjectTerminalShortcutsEnabled,
    alertBannerMessage,
    alertBannerType,
    alertBannerIdentifier,
    costObjectSettings,
    getTerminalShortcuts,
    fetchConfig,
    $reset,
  }
})
