//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  computed,
} from 'vue'
import {
  useRouter,
  useRoute,
} from 'vue-router'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useLocalStorageStore } from '@/store/localStorage'

import { TargetEnum } from '@/utils'

import {
  GSymbolTree,
  Leaf,
} from '@/lib/g-symbol-tree'

import { useApi } from './useApi'

import {
  every,
  get,
  pick,
  filter,
  includes,
  map,
  merge,
  cloneDeep,
  difference,
} from '@/lodash'

export const useTerminalSplitpanes = () => {
  const api = useApi()
  const router = useRouter()
  const route = useRoute()
  const authzStore = useAuthzStore()
  const appStore = useAppStore()
  const localStorageStore = useLocalStorageStore()

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

  const slotItemUUIds = computed(() => {
    const slotItems = filter(symbolTree.items(), ['data.type', 'SLOT_ITEM'])
    return map(slotItems, 'uuid')
  })

  const defaultTarget = computed(() => {
    return terminalCoordinates.value.target || (authzStore.hasControlPlaneTerminalAccess ? TargetEnum.CONTROL_PLANE : TargetEnum.SHOOT)
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
    const data = localStorageStore.terminalSplitpaneTree
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
    localStorageStore.terminalSplitpaneTree = onySlotItemsInTree || symbolTree.isEmpty()
      ? null // clear value
      : splitpaneTree.value
  }

  function targetIdOrDefault (targetId) {
    if (!targetId) {
      targetId = appStore.focusedElementId // TODO check if it still works
    }
    if (!targetId) {
      const lastChild = symbolTree.lastChild(symbolTree.root, true)
      targetId = get(lastChild, 'uuid')
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
    splitpaneTree,
    newTerminalPrompt,
    terminalCoordinates,
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
