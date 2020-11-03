<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    class="g-droppable-listener"
    style="height:100%; width:100%;"
    v-shortkey.once="{bottom: ['ctrl', 'shift', 'h'], right: ['ctrl', 'shift', 'v']}"
    @dropped="droppedAt"
    @shortkey="addFromShortkey"
  >
    <g-splitpane
      v-if="splitpaneTree"
      :splitpaneTree="splitpaneTree"
      ref="splitpane"
    >
      <template v-slot="{item}">
        <slot v-if="item.data.type === 'SLOT_ITEM'" v-bind:item="item"></slot>
        <g-terminal
          v-else
          :uuid="item.uuid"
          :data="item.data"
          @terminated="onTermination(item)"
          @split="orientation => onSplit(item, orientation)"
        ></g-terminal>
      </template>
    </g-splitpane>
    <create-terminal-session-dialog
      ref="newTerminal"
      :name="name"
      :namespace="namespace"
    ></create-terminal-session-dialog>
  </div>
</template>

<script>

import { mapGetters } from 'vuex'
import every from 'lodash/every'
import get from 'lodash/get'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import map from 'lodash/map'
import merge from 'lodash/merge'
import cloneDeep from 'lodash/cloneDeep'
import difference from 'lodash/difference'
import GSplitpane from '@/components/GSplitpane'
import GTerminal from '@/components/GTerminal'
import CreateTerminalSessionDialog from '@/components/dialogs/CreateTerminalSessionDialog'
import { TargetEnum, routeName } from '@/utils'
import { listTerminalSessions } from '@/utils/api'
import { GSymbolTree, Leaf, PositionEnum } from '@/lib/g-symbol-tree'

import 'splitpanes/dist/splitpanes.css'

function terminatedSessionIds (uuids, terminals) {
  const terminalSessionIds = map(terminals, 'metadata.identifier')
  return difference(uuids, terminalSessionIds)
}

export default {
  components: {
    GSplitpane,
    GTerminal,
    CreateTerminalSessionDialog
  },
  props: {
    name: {
      type: String
    },
    namespace: {
      type: String
    },
    target: {
      type: String
    }
  },
  data () {
    return {
      tree: new GSymbolTree(),
      splitpaneTree: undefined // splitpaneTree is a json object representation of the GSymbolTree`this.tree`
    }
  },
  computed: {
    ...mapGetters([
      'focusedElementId',
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess'
    ]),
    terminalCoordinates () {
      const coordinates = {
        name: this.name,
        namespace: this.namespace,
        target: this.target
      }
      return coordinates
    },
    storeKey () {
      const { name, namespace } = this.terminalCoordinates
      const route = routeName(this.$route)
      return `${route}--${namespace}--${name}`
    },
    slotItemUUIds () {
      const slotItems = filter(this.tree.items(), ['data.type', 'SLOT_ITEM'])
      return map(slotItems, 'uuid')
    }
  },
  methods: {
    updateSplitpaneTree () {
      this.splitpaneTree = this.tree.toJSON(this.tree.root)
      this.saveSplitpaneTree()
    },
    addFromShortkey ({ srcKey: position = PositionEnum.RIGHT } = {}) {
      return this.add({ position })
    },
    targetIdOrDefault (targetId) {
      if (!targetId) {
        targetId = this.focusedElementId
      }
      if (!targetId) {
        const lastChild = this.tree.lastChild(this.tree.root, true)
        targetId = get(lastChild, 'uuid')
      }
      return targetId
    },
    async add ({ position, targetId } = {}) {
      targetId = this.targetIdOrDefault(targetId)

      const defaultTaget = this.terminalCoordinates.target || (this.hasControlPlaneTerminalAccess ? TargetEnum.CONTROL_PLANE : TargetEnum.SHOOT)
      const selections = await this.$refs.newTerminal.promptForSelections({ target: defaultTaget })

      if (!selections) {
        this.leavePageIfTreeEmpty()
        return
      }

      selections.forEach(selection => {
        let data = cloneDeep(this.terminalCoordinates)
        data = merge(data, selection)
        if (!data.target) {
          return
        }

        this.addItemWith({ data, targetId, position })
      })

      this.leavePageIfTreeEmpty()
    },
    leavePageIfTreeEmpty () {
      if (this.tree.isEmpty()) {
        this.leavePage()
      }
    },
    async addShortcut ({ position, targetId, shortcut } = {}) {
      targetId = this.targetIdOrDefault(targetId)

      let data = cloneDeep(this.terminalCoordinates)
      data = merge(data, shortcut)

      if (data.target) {
        this.addItemWith({ data, targetId, position })
      }

      if (this.tree.isEmpty()) {
        this.leavePage()
      }
    },
    addItemWith ({ data, targetId, position }) {
      const item = new Leaf({ data })
      if (targetId && position) {
        this.tree.appendChild(this.tree.root, item)
        const sourceId = item.uuid

        this.moveTo({ sourceId, targetId, position })
      } else {
        this.tree.appendChild(this.tree.root, item)
        this.updateSplitpaneTree()
      }
    },
    addSlotItem ({ data = {}, targetId, position } = {}) {
      data.type = 'SLOT_ITEM'
      this.addItemWith({ data, targetId, position })
    },
    droppedAt ({ detail: { mouseOverId: position, sourceElementDropzoneId: sourceId, mouseOverDropzoneId: targetId } }) {
      this.moveTo({ sourceId, targetId, position })
    },
    moveTo ({ sourceId, targetId, position }) {
      this.tree.moveToWithId({ sourceId, targetId, position })

      this.updateSplitpaneTree()
    },
    removeWithId (id) {
      this.tree.removeWithId(id)

      this.updateSplitpaneTree()
    },
    saveSplitpaneTree () {
      const onySlotItemsInTree = every(this.tree.ids(), id => includes(this.slotItemUUIds, id))
      if (onySlotItemsInTree || this.tree.isEmpty()) {
        this.$localStorage.removeItem(this.storeKey)
        return
      }
      this.$localStorage.setItem(this.storeKey, JSON.stringify({
        splitpaneTree: this.splitpaneTree
      }))
    },
    async load (addItemFn) {
      await this.restoreSessions(addItemFn)

      this.updateSplitpaneTree()
    },
    async restoreSessions (addItemFn = () => this.add()) {
      const fromStore = this.$localStorage.getItem(this.storeKey)
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

      const { namespace } = this.terminalCoordinates
      const { data: terminals } = await listTerminalSessions({ namespace })

      this.tree = GSymbolTree.fromJSON(splitpaneTree)

      let uuids = this.tree.ids()
      uuids = filter(uuids, uuid => !includes(this.slotItemUUIds, uuid))
      const terminatedIds = terminatedSessionIds(uuids, terminals)
      this.tree.removeWithIds(terminatedIds)

      if (this.tree.isEmpty()) { // nothing to restore
        addItemFn()
      }
    },
    leavePage () {
      const { name, namespace } = this.terminalCoordinates
      if (name) {
        return this.$router.push({ name: 'ShootItem', params: { namespace, name } })
      }
      return this.$router.push({ name: 'ShootList', params: { namespace } })
    },
    onTermination ({ uuid }) {
      this.removeWithId(uuid)
      if (this.tree.isEmpty()) {
        this.leavePage()
      }
    },
    onSplit ({ uuid: targetId }, orientation = 'horizontal') {
      switch (orientation) {
        case 'horizontal':
          this.add({ position: PositionEnum.RIGHT, targetId })
          break
        case 'vertical':
          this.add({ position: PositionEnum.BOTTOM, targetId })
          break
      } // ignore unknown orientations
    }
  }
}

</script>

<style lang="scss" scoped>
</style>
