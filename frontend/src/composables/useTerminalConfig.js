//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  reactive,
  watch,
  inject,
  provide,
} from 'vue'

import { useAuthnStore } from '@/store/authn'

import get from 'lodash/get'
import head from 'lodash/head'
import some from 'lodash/some'

export function createTerminalConfigComposable () {
  const authnStore = useAuthnStore()

  function updateState (options = {}) {
    const {
      container = {},
      defaultNode,
      currentNode,
      privilegedMode,
      nodes = [],
      canScheduleOnSeed = false,
    } = options

    const autoSelectNodeItem = {
      data: {
        kubernetesHostname: '<AUTO-SELECT>', // node will be auto selected by the kube-scheduler. Value needs to be set to any value
      },
    }

    state.node = defaultNode
    if (!defaultNode && nodes.length) {
      state.node = authnStore.isAdmin
        ? get(head(nodes), ['data', 'kubernetesHostname'])
        : autoSelectNodeItem.data.kubernetesHostname
    }

    if (!authnStore.isAdmin || !canScheduleOnSeed) {
      state.runtime = 'shoot'
    } else {
      const currentNodeIsShootWorker = some(nodes, ['data.kubernetesHostname', currentNode])
      state.runtime = currentNodeIsShootWorker ? 'shoot' : 'seed'
    }

    state.containerImage = container.image
    state.privilegedMode = privilegedMode
    state.shootNodes = nodes
    if (nodes.length) {
      state.shootNodes.unshift(autoSelectNodeItem)
    }
    state.canScheduleOnSeed = canScheduleOnSeed
  }

  const state = reactive({
    node: '',
    containerImage: '',
    shootNodes: [],
    privilegedMode: false,
    runtime: 'shoot',
    canScheduleOnSeed: false,
  })

  function isAutoSelectNode (hostname) {
    return hostname === '<AUTO-SELECT>'
  }

  const config = computed(() => {
    const node = isAutoSelectNode(state.node)
      ? undefined
      : state.node

    return {
      container: {
        image: state.containerImage,
        privileged: state.privilegedMode,
      },
      node,
      preferredHost: state.runtime,
      hostPID: state.privilegedMode,
      hostNetwork: state.privilegedMode,
    }
  })

  watch(() => state.runtime, value => {
    /* If user is admin, the default runtime is an infrastructure cluster.
      An admin would usually only choose the cluster as terminal runtime when in need of troubleshooting the worker nodes. Hence, enable privileged mode automatically.
      */
    if (authnStore.isAdmin) {
      state.privilegedMode = value === 'shoot'
    }
    if (!state.canScheduleOnSeed) {
      state.privilegedMode = false
    }
  })

  return {
    state,
    config,
    updateState,
  }
}

export function useTerminalConfig () {
  return inject('terminal-config', null)
}

export function useProvideTerminalConfig () {
  const terminalConfigComposable = createTerminalConfigComposable()
  provide('terminal-config', terminalConfigComposable)
  return terminalConfigComposable
}
