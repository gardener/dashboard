<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <div
    class="g-droppable-listener"
    @dropped="droppedAt"
    style="height:100%; width:100%; background-color: #333"
    v-shortkey.once="{bottom: ['ctrl', 'shift', 'y'], right: ['ctrl', 'y']}"
    @shortkey="addFromShortkey"
  >
    <g-splitpane v-if="treeItem" :splitpaneTreeItem="treeItem">
      <template v-slot="{item}">
        <g-terminal
          :uuid="item.uuid"
          :index="item.index"
          :data="item.data"
          @terminated="onTermination(item)"
          @split="orientation => onSplit(item, orientation)"
        ></g-terminal>
      </template>
    </g-splitpane>
    <target-selection-dialog ref="targetDialog" :shootItem="shootItem"></target-selection-dialog>
  </div>
</template>

<script>

import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'
import SymbolTree from 'symbol-tree'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import keyBy from 'lodash/keyBy'
import keys from 'lodash/keys'
import map from 'lodash/map'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
import size from 'lodash/size'
import values from 'lodash/values'
import cloneDeep from 'lodash/cloneDeep'
import difference from 'lodash/difference'
import GSplitpane from '@/components/GSplitpane'
import GTerminal from '@/components/GTerminal'
import TargetSelectionDialog from '@/dialogs/TargetSelectionDialog'
import { TargetEnum } from '@/utils'
import { shootItem } from '@/mixins/shootItem'
import { listTerminalSessions } from '@/utils/api'

import 'splitpanes/dist/splitpanes.css'

Vue.use(require('vue-shortkey'))

const uuidv4 = require('uuid/v4')

class TreeItem {
  constructor ({ uuid = uuidv4(), data, index }) {
    this.uuid = uuid
    this.data = data
    this.index = index
  }
}

class SplitpaneTreeItem {
  constructor ({ horizontal }) {
    this.horizontal = horizontal
    this.splitpane = true
  }
}

function toTree (tree, parent) {
  if (!tree.hasChildren(parent)) {
    return undefined
  }
  const items = []
  for (const child of tree.childrenIterator(parent)) {
    const clonedChild = cloneDeep(child)
    if (child instanceof SplitpaneTreeItem) {
      clonedChild.items = toTree(tree, child)
    }
    items.push(clonedChild)
  }
  return items
}

function toSymbolTree ({ tree, parent, items, itemMap }) {
  if (items) {
    items.forEach(item => {
      if (item.items) {
        const splitpaneTreeItem = new SplitpaneTreeItem({ horizontal: item.horizontal })
        tree.appendChild(parent, splitpaneTreeItem)
        toSymbolTree({ tree, parent: splitpaneTreeItem, items: item.items, itemMap: itemMap })
      } else {
        const treeItem = itemMap[item.uuid]
        if (treeItem) {
          tree.appendChild(parent, treeItem)
        }
      }
    })
  }
}

function omitTerminatedSessions (itemMap, terminals) {
  const uuids = keys(itemMap)
  const terminalSessionIds = map(terminals, 'metadata.identifier')
  const uuidsToRemove = difference(uuids, terminalSessionIds)
  return omit(itemMap, uuidsToRemove)
}

function cleanTree ({ tree, root, item }) {
  if (root !== item && tree.childrenCount(item) === 1) {
    const onlyChild = tree.firstChild(item)
    tree.remove(onlyChild)
    tree.insertBefore(item, onlyChild)
    tree.remove(item)
    return onlyChild
  }
  for (const child of tree.childrenIterator(item)) {
    cleanTree({ tree, root, item: child })
  }

  return item
}

function ensureSplitpaneOrientation ({ tree, horizontal, targetParent, targetItem }) {
  if (targetParent.horizontal === horizontal) {
    return
  }
  if (tree.childrenCount(targetParent) === 1) {
    targetParent.horizontal = horizontal
    return
  }

  // set new splitpane with desired orientation at the position of the targetItem and place target item under new splitpane
  const splitpane = new SplitpaneTreeItem({ horizontal })
  tree.insertBefore(targetItem, splitpane)
  targetParent = splitpane

  tree.remove(targetItem)
  tree.prependChild(targetParent, targetItem)
}

function lastLeaf ({ tree, item }) {
  if (!item) {
    return
  }
  const lastChild = tree.lastChild(item)
  if (!lastChild) {
    return item
  }
  const leaf = lastLeaf({ tree, lastChild })
  if (!leaf) {
    return lastChild
  }
}

export default {
  components: {
    GSplitpane,
    GTerminal,
    TargetSelectionDialog
  },
  data () {
    return {
      tree: new SymbolTree(),
      itemMap: {},
      root: new SplitpaneTreeItem({ horizontal: false }),
      treeItem: undefined
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'focusedElementId',
      'shootByNamespaceAndName',
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess'
    ]),
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    terminalCoordinates () {
      const coordinates = pick(this.$route.params, ['name', 'namespace', 'target'])
      return coordinates
    },
    storeKey () {
      const { name, namespace, target } = this.terminalCoordinates
      let storeKey = ''
      if (target) {
        storeKey += target
      }
      storeKey += `--${namespace}`
      if (name) {
        storeKey += `--${name}`
      }
      return storeKey
    }
  },
  methods: {
    ...mapActions([
      'setSplitpaneResize'
    ]),
    droppedAt ({ detail: { 'mouseOverId': position, 'sourceElementDropzoneId': sourceId, 'mouseOverDropzoneId': targetId } }) {
      this.moveTo({ sourceId, targetId, position })
    },
    moveTo ({ sourceId, targetId, position }) {
      if (!targetId || !sourceId) {
        return
      }

      const targetItem = this.itemMap[targetId]
      const sourceItem = this.itemMap[sourceId]
      if (!targetItem || !sourceItem) {
        return
      }

      const fitRequired = true // in some cases the resize event is not fired by the splitpanes library so we need to trigger fit manually

      const targetParent = this.tree.parent(targetItem)
      this.tree.remove(sourceItem)
      switch (position) {
        case 'top': {
          ensureSplitpaneOrientation({ tree: this.tree, horizontal: true, targetParent, targetItem })
          this.tree.insertBefore(targetItem, sourceItem)
          break
        }
        case 'bottom': {
          ensureSplitpaneOrientation({ tree: this.tree, horizontal: true, targetParent, targetItem })
          this.tree.insertAfter(targetItem, sourceItem)
          break
        }
        case 'left': {
          ensureSplitpaneOrientation({ tree: this.tree, horizontal: false, targetParent, targetItem })
          this.tree.insertBefore(targetItem, sourceItem)
          break
        }
        case 'right': {
          ensureSplitpaneOrientation({ tree: this.tree, horizontal: false, targetParent, targetItem })
          this.tree.insertAfter(targetItem, sourceItem)
          break
        }
      }

      this.update(fitRequired)
    },
    update (fitRequired = false) {
      this.root = cleanTree({ tree: this.tree, root: this.root, item: this.root })

      this.updateTreeItem(fitRequired)
    },
    remove ({ id }) {
      const item = this.itemMap[id]
      if (!item) {
        return
      }

      this.tree.remove(item)
      Vue.delete(this.itemMap, id)

      this.update()
    },
    updateTreeItem (fitRequired = false) {
      const clonedRoot = cloneDeep(this.root)
      clonedRoot.items = toTree(this.tree, this.root)
      this.treeItem = clonedRoot

      this.store()

      if (fitRequired) {
        // we need to make sure to adjust the size and geometry of each terminal after moving splitpanes

        // use $nextTick as splitpanes library needs to be finished with rendering because fitAddon relies on
        // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
        this.$nextTick(() => this.setSplitpaneResize(new Date()))
      }
    },
    addFromShortkey ({ srcKey: position = 'right' } = {}) {
      return this.add({ position })
    },
    async add ({ position, targetId } = {}) {
      if (!targetId) {
        targetId = this.focusedElementId
      }
      if (!targetId) {
        const leaf = lastLeaf({ tree: this.tree, item: this.root })
        if (leaf !== this.root) {
          targetId = get(leaf, 'uuid')
        }
      }

      const data = cloneDeep(this.terminalCoordinates)
      if (!data.target) {
        let target
        if (this.hasControlPlaneTerminalAccess && this.hasShootTerminalAccess) {
          const defaultTaget = this.hasControlPlaneTerminalAccess ? TargetEnum.CONTROL_PLANE : TargetEnum.SHOOT
          target = await this.$refs.targetDialog.promptForTargetSelection({ target: defaultTaget })
        } else if (this.hasShootTerminalAccess) {
          target = TargetEnum.SHOOT
        }

        if (!target) {
          if (isEmpty(this.itemMap)) {
            this.leavePage()
          }
          return
        }
        data.target = target
      }

      const index = size(this.itemMap) + 1
      const item = new TreeItem({ data, index })
      const sourceId = item.uuid

      Vue.set(this.itemMap, sourceId, item)

      if (targetId) {
        this.moveTo({ sourceId, targetId, position })
      } else {
        this.tree.appendChild(this.root, item)
        this.updateTreeItem()
      }
    },
    store () {
      if (isEmpty(this.itemMap)) {
        this.$localStorage.removeItem(this.storeKey)
        return
      }
      this.$localStorage.setItem(this.storeKey, JSON.stringify({
        treeItemJson: this.treeItem,
        items: values(this.itemMap)
      }))
    },
    async load () {
      let fromStore = this.$localStorage.getItem(this.storeKey)
      if (fromStore) {
        const { treeItemJson, items } = JSON.parse(fromStore)
        const treeItems = map(items, item => new TreeItem({ ...item }))

        const itemMap = keyBy(treeItems, 'uuid')

        const { namespace } = this.terminalCoordinates
        const { data: terminals } = await listTerminalSessions({ namespace })
        this.itemMap = omitTerminatedSessions(itemMap, terminals)

        if (isEmpty(this.itemMap)) { // nothing to restore
          this.add()
          return
        }
        this.tree = new SymbolTree()
        this.root = new SplitpaneTreeItem({ horizontal: treeItemJson.horizontal })
        toSymbolTree({ tree: this.tree, parent: this.root, items: treeItemJson.items, itemMap: this.itemMap })

        this.update()
      } else {
        this.add()
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
      this.remove({ id: uuid })
      if (isEmpty(this.itemMap)) {
        this.leavePage()
      }
    },
    onSplit ({ uuid: targetId }, orientation = 'horizontal') {
      switch (orientation) {
        case 'horizontal':
          this.add({ position: 'right', targetId })
          break
        case 'vertical':
          this.add({ position: 'bottom', targetId })
          break
        default:
          break // ignore unknown orientation
      }
    }
  },
  mounted () {
    this.load()
  }
}

</script>
