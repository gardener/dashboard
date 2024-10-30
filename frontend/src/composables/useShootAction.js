//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  reactive,
  computed,
  toRef,
  inject,
  provide,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import { get } from '@/lodash'

export function createShootActionEventComposable (options = {}) {
  const {
    shootStore = useShootStore(),
  } = options

  const state = reactive({
    name: '',
    target: null,
  })

  const shootActionItem = toRef(shootStore, 'selectedShoot')
  const shootActionTarget = computed(() => state.target)

  function setShootActionEvent (name, shootItem, target = null) {
    const metadata = get(shootItem, ['metadata'], null)
    shootStore.setSelection(metadata)
    state.name = name
    state.target = target
  }

  function createShootActionFlag (name) {
    return computed({
      get () {
        return state.name === name
      },
      set (value) {
        if (!value) {
          setShootActionEvent('', null, null)
        }
      },
    })
  }

  return {
    shootActionItem,
    shootActionTarget,
    setShootActionEvent,
    createShootActionFlag,
  }
}

export function useShootAction () {
  return inject('shoot-action-event', null)
}

export function useProvideShootAction (options) {
  const composable = createShootActionEventComposable(options)
  provide('shoot-action-event', composable)
  return composable
}
