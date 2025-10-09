//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  computed,
  inject,
  provide,
} from 'vue'
import {
  useRouter,
  useRoute,
} from 'vue-router'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useLocalStorageStore } from '@/store/localStorage'

import { useApi } from '@/composables/useApi'

import {
  isStatusHibernated,
  TargetEnum,
} from '@/utils'

import {
  GSymbolTree,
  Leaf,
} from '@/lib/g-symbol-tree'

import every from 'lodash/every'
import get from 'lodash/get'
import pick from 'lodash/pick'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import merge from 'lodash/merge'
import cloneDeep from 'lodash/cloneDeep'
import difference from 'lodash/difference'

export function createTerminalSplitpanesComposable () {
  const api = useApi()
  const router = useRouter()
  const route = useRoute()
  const authzStore = useAuthzStore()
  const appStore = useAppStore()
  const shootStore = useShootStore()
  const localStorageStore = useLocalStorageStore()
  const terminalSplitpaneTree = localStorageStore.terminalSplitpaneTreeRef(route)

  let symbolTree = new GSymbolTree()
  const newTerminal = {
    position: '',
    targetId: '',
  }

  const splitpaneTree = ref({})
  const newTerminalPrompt = ref(false)

  const terminalCoordinates = computed(() => {
    return pick(route.params, ['name', 'namespace', 'target'])
  })

  const shootItem = computed(() => {
    return shootStore.shootByNamespaceAndName(terminalCoordinates.value)
  })

  const shootNamespace = computed(() => {
    return get(terminalCoordinates.value, ['namespace'])
  })

  const shootName = computed(() => {
    return get(terminalCoordinates.value, ['name'])
  })

  const hasShootWorkerGroups = computed(() => {
    return !isEmpty(get(shootItem.value, ['spec', 'provider', 'workers'], []))
  })

  const isShootStatusHibernated = computed(() => {
    return isStatusHibernated(get(shootItem.value, ['status']))
  })

  const canScheduleOnSeed = computed(() => {
    return get(shootItem.value, ['info', 'canLinkToSeed'], false)
  })

  const slotItemUUIds = computed(() => {
    const slotItems = filter(symbolTree.items(), ['data.type', 'SLOT_ITEM'])
    return map(slotItems, 'uuid')
  })

  const defaultTarget = computed(() => {
    if (terminalCoordinates.value.target) {
      return terminalCoordinates.value.target
    }
    if (get(shootItem.value, ['info', 'canLinkToSeed']) === undefined) {
      // target depends on shootItem info, this ensures target is stable during loading
      return undefined
    }
    if (authzStore.hasControlPlaneTerminalAccess && canScheduleOnSeed.value) {
      return TargetEnum.CONTROL_PLANE
    }
    return TargetEnum.SHOOT
  })

  function addSlotItem ({ data = {}, targetId, position } = {}) {
    data.type = 'SLOT_ITEM'
    addItemWith({ data, targetId, position })
  }

  async function load (addItemFn) {
    await restoreSessions(addItemFn)

    updateSplitpaneTree()
  }

  function addShortcut ({ position, targetId, shortcut } = {}) {
    targetId = targetIdOrDefault(targetId)

    let data = cloneDeep(terminalCoordinates.value)
    data = merge(data, shortcut)

    if (data.target) {
      addItemWith({ data, targetId, position })
    }

    if (symbolTree.isEmpty()) {
      leavePage()
    }
  }

  async function restoreSessions (addItemFn = () => add()) {
    const data = terminalSplitpaneTree.value
    if (!data) {
      addItemFn()
      return
    }

    const { namespace } = terminalCoordinates.value
    const { data: terminals } = await api.listTerminalSessions({ namespace })

    symbolTree = GSymbolTree.fromJSON(data.splitpaneTree ? data.splitpaneTree : data) // backward compatible

    let uuids = symbolTree.ids()
    uuids = filter(uuids, uuid => !includes(slotItemUUIds.value, uuid))
    const terminatedIds = terminatedSessionIds(uuids, terminals)
    symbolTree.removeWithIds(terminatedIds)

    if (symbolTree.isEmpty()) { // nothing to restore
      addItemFn()
    }
  }

  function terminatedSessionIds (uuids, terminals) {
    const terminalSessionIds = map(terminals, 'metadata.identifier')
    return difference(uuids, terminalSessionIds)
  }

  function add ({ position, targetId } = {}) {
    newTerminal.position = position
    newTerminal.targetId = targetIdOrDefault(targetId)
    newTerminalPrompt.value = true
  }

  function setSelections (selections) {
    newTerminalPrompt.value = false

    const {
      position,
      targetId,
    } = newTerminal

    if (!selections) {
      leavePageIfTreeEmpty()
      return
    }

    selections.forEach(selection => {
      let data = cloneDeep(terminalCoordinates.value)
      data = merge(data, selection)
      if (!data.target) {
        return
      }

      addItemWith({ data, targetId, position })
    })

    leavePageIfTreeEmpty()
  }

  function updateSplitpaneTree () {
    splitpaneTree.value = symbolTree.toJSON(symbolTree.root)

    const onySlotItemsInTree = every(symbolTree.ids(), id => includes(slotItemUUIds.value, id))
    terminalSplitpaneTree.value = onySlotItemsInTree || symbolTree.isEmpty()
      ? null // clear value
      : splitpaneTree.value
  }

  function targetIdOrDefault (targetId) {
    if (!targetId) {
      targetId = appStore.focusedElementId
    }
    if (!targetId) {
      const lastChild = symbolTree.lastChild(symbolTree.root, true)
      targetId = get(lastChild, ['uuid'])
    }
    return targetId
  }

  function leavePageIfTreeEmpty () {
    if (symbolTree.isEmpty()) {
      leavePage()
    }
  }

  function addItemWith ({ data, targetId, position }) {
    const item = new Leaf({ data })
    if (targetId && position) {
      symbolTree.appendChild(symbolTree.root, item)
      const sourceId = item.uuid

      moveTo({ sourceId, targetId, position })
    } else {
      symbolTree.appendChild(symbolTree.root, item)
      updateSplitpaneTree()
    }
  }

  function moveTo ({ sourceId, targetId, position }) {
    symbolTree.moveToWithId({ sourceId, targetId, position })

    updateSplitpaneTree()
  }

  function removeWithId (id) {
    symbolTree.removeWithId(id)

    updateSplitpaneTree()
  }

  function leavePage () {
    const { name, namespace } = terminalCoordinates.value
    if (name) {
      return router.push({ name: 'ShootItem', params: { namespace, name } })
    }
    return router.push({ name: 'ShootList', params: { namespace } })
  }

  function isTreeEmpty () {
    return symbolTree.isEmpty()
  }

  return {
    terminalCoordinates,
    shootItem,
    shootNamespace,
    shootName,
    hasShootWorkerGroups,
    isShootStatusHibernated,
    canScheduleOnSeed,
    splitpaneTree,
    newTerminalPrompt,
    defaultTarget,
    add,
    setSelections,
    addSlotItem,
    load,
    addShortcut,
    removeWithId,
    moveTo,
    leavePage,
    isTreeEmpty,
  }
}

export function useTerminalSplitpanes () {
  return inject('terminal-splitpanes', null)
}

export function useProvideTerminalSplitpanes () {
  const terminalSplitpanesComposable = createTerminalSplitpanesComposable()
  provide('terminal-splitpanes', terminalSplitpanesComposable)
  return terminalSplitpanesComposable
}
