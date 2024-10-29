//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
  provide,
  reactive,
} from 'vue'

export function createShootActionEventComposable () {
  const state = reactive({
    name: '',
    target: null,
  })

  const shootActionEventName = computed(() => {
    return state.name
  })

  const shootActionEventTarget = computed(() => {
    return state.target
  })

  function setShootActionEvent (name, target) {
    state.name = name
    if (typeof target === 'object') {
      state.target = target
    }
  }

  function clearShootActionEvent () {
    setShootActionEvent('', null)
  }

  return {
    shootActionEventName,
    shootActionEventTarget,
    setShootActionEvent,
    clearShootActionEvent,
  }
}

export function useShootActionEvent () {
  return inject('shoot-action-event', null)
}

export function useProvideShootActionEvent (options) {
  const composable = createShootActionEventComposable(options)
  provide('shoot-action-event', composable)
  return composable
}
