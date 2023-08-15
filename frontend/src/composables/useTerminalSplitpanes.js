//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  reactive,
  toRef,
  unref,
} from 'vue'
import {
  useRouter,
  useRoute,
} from 'vue-router'
import { useLocalStorage } from '@vueuse/core'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'

import {
  TargetEnum,
  routeName,
} from '@/utils'

import {
  GSymbolTree,
  Leaf,
} from '@/lib/g-symbol-tree'

import { useApi } from './useApi'

import {
  every,
  get,
  filter,
  includes,
  map,
  merge,
  cloneDeep,
  difference,
} from '@/lodash'

export const useTerminalSplitpanes = ({ name, namespace, target }) => {
  const router = useRouter()
  const currentRoute = useRoute()

  const authzStore = useAuthzStore()
  const appStore = useAppStore()

  const hasControlPlaneTerminalAccess = toRef(authzStore, 'hasControlPlaneTerminalAccess')

  const focusedElementId = toRef(appStore, 'focusedElementId')

  const state = reactive({
    tree: new GSymbolTree(),
    splitpaneTree: {}, // splitpaneTree is a json object representation of the GSymbolTree`state.tree`
    newTerminal: {
      position: '',
      targetId: '',
    },
  })

  const terminalCoordinates = computed(() => {
    const coordinates = {
      name: name.value,
      namespace: namespace.value,
      target: unref(target), // optional
    }
    return coordinates
  })

  const storeKey = computed(() => {
    const { name, namespace } = terminalCoordinates.value
    const route = routeName(currentRoute)
    return `${route}--${namespace}--${name}`
  })

  const slotItemUUIds = computed(() => {
    const slotItems = filter(state.tree.items(), ['data.type', 'SLOT_ITEM'])
    return map(slotItems, 'uuid')
  })

  const defaultTarget = computed(() => {
    return terminalCoordinates.value.target || (hasControlPlaneTerminalAccess.value ? TargetEnum.CONTROL_PLANE : TargetEnum.SHOOT)
  })

  const api = useApi()

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

    if (state.tree.isEmpty()) {
      leavePage()
    }
  }

  async function restoreSessions (addItemFn = () => add()) {
    const fromStore = getLocalStorageObject(storeKey.value)
    if (!fromStore) {
      addItemFn()
      return
    }

    let splitpaneTree
    try {
      const json = JSON.parse(fromStore)
      splitpaneTree = json.splitpaneTree
    } catch (err) {
      // could not restore session
    }
    if (!splitpaneTree) {
      addItemFn()
      return
    }

    const { namespace } = terminalCoordinates.value
    const { data: terminals } = await api.listTerminalSessions({ namespace })

    state.tree = GSymbolTree.fromJSON(splitpaneTree)

    let uuids = state.tree.ids()
    uuids = filter(uuids, uuid => !includes(slotItemUUIds, uuid))
    const terminatedIds = terminatedSessionIds(uuids, terminals)
    state.tree.removeWithIds(terminatedIds)

    if (state.tree.isEmpty()) { // nothing to restore
      addItemFn()
    }
  }

  function terminatedSessionIds (uuids, terminals) {
    const terminalSessionIds = map(terminals, 'metadata.identifier')
    return difference(uuids, terminalSessionIds)
  }

  function add ({ position, targetId } = {}) {
    state.newTerminal.position = position
    state.newTerminal.targetId = targetIdOrDefault(targetId)
    state.newTerminal.show = true
  }

  function setSelections (selections) {
    state.newTerminal.show = false

    const {
      position,
      targetId,
    } = state.newTerminal

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

  function getLocalStorageObject (key) {
    return useLocalStorage(key).value
  }

  function setLocalStorageObject (key, value) {
    useLocalStorage(key).value = value
  }

  function updateSplitpaneTree () {
    state.splitpaneTree = state.tree.toJSON(state.tree.root)
    saveSplitpaneTree()
  }

  function targetIdOrDefault (targetId) {
    if (!targetId) {
      targetId = focusedElementId.value // TODO check if it still works
    }
    if (!targetId) {
      const lastChild = state.tree.lastChild(state.tree.root, true)
      targetId = get(lastChild, 'uuid')
    }
    return targetId
  }

  function leavePageIfTreeEmpty () {
    if (state.tree.isEmpty()) {
      leavePage()
    }
  }

  function addItemWith ({ data, targetId, position }) {
    const item = new Leaf({ data })
    if (targetId && position) {
      state.tree.appendChild(state.tree.root, item)
      const sourceId = item.uuid

      moveTo({ sourceId, targetId, position })
    } else {
      state.tree.appendChild(state.tree.root, item)
      updateSplitpaneTree()
    }
  }

  function moveTo ({ sourceId, targetId, position }) {
    state.tree.moveToWithId({ sourceId, targetId, position })

    updateSplitpaneTree()
  }

  function removeWithId (id) {
    state.tree.removeWithId(id)

    updateSplitpaneTree()
  }

  function saveSplitpaneTree () {
    const onySlotItemsInTree = every(state.tree.ids(), id => includes(slotItemUUIds, id))
    if (onySlotItemsInTree || state.tree.isEmpty()) {
      setLocalStorageObject(storeKey.value) // clear value
      return
    }
    setLocalStorageObject(storeKey.value, JSON.stringify({
      splitpaneTree: state.splitpaneTree,
    }))
  }

  function leavePage () {
    const { name, namespace } = terminalCoordinates.value
    if (name) {
      return router.push({ name: 'ShootItem', params: { namespace, name } })
    }
    return router.push({ name: 'ShootList', params: { namespace } })
  }

  return {
    state,
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
  }
}
