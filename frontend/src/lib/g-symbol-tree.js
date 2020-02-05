//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import Vue from 'vue'
import cloneDeep from 'lodash/cloneDeep'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import keys from 'lodash/keys'
import compact from 'lodash/compact'
import values from 'lodash/values'
import SymbolTree from 'symbol-tree'
const uuidv4 = require('uuid/v4')

export const PositionEnum = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
}

export class TreeItem {
  constructor ({ uuid = uuidv4(), data } = {}) {
    this.uuid = uuid
    this.data = data
  }
}

export class SplitpaneTreeItem {
  constructor ({ horizontal = false } = {}) {
    this.horizontal = horizontal
  }
}

export class GSymbolTree extends SymbolTree {
  constructor ({ description, horizontal = false } = {}) {
    super(description)

    this.itemMap = {}
    this.root = new SplitpaneTreeItem({ horizontal })
  }

  appendChild (referenceObject, newObject) {
    this._addToItemMap(newObject)

    super.appendChild(referenceObject, newObject)
  }

  prependChild (referenceObject, newObject) {
    this._addToItemMap(newObject)

    super.prependChild(referenceObject, newObject)
  }

  insertBefore (referenceObject, newObject) {
    this._addToItemMap(newObject)

    super.insertBefore(referenceObject, newObject)
  }

  insertAfter (referenceObject, newObject) {
    this._addToItemMap(newObject)

    super.insertAfter(referenceObject, newObject)
  }

  remove (removeObject, clean = true) {
    this._removeFromItemMap(removeObject)

    super.remove(removeObject)

    if (clean) {
      this._clean()
    }
  }

  lastChild (object, recursive = true) {
    if (!object) {
      return
    }
    const lastChild = super.lastChild(object)
    if (!recursive) {
      return lastChild
    }

    return this.lastChild(lastChild, recursive) || lastChild
  }

  items () {
    return values(this.itemMap)
  }

  ids () {
    return keys(this.itemMap)
  }

  isEmpty () {
    return isEmpty(this.itemMap)
  }

  moveToWithId ({ sourceId, targetId, position }) {
    if (!targetId || !sourceId) {
      return
    }

    const targetItem = this.itemMap[targetId]
    const sourceItem = this.itemMap[sourceId]
    if (!targetItem || !sourceItem) {
      return
    }

    this._moveToAndClean({ sourceItem, targetItem, position })
  }

  removeWithIds (ids) {
    forEach(ids, id => this.removeWithId(id, false))

    this._clean()
  }

  removeWithId (id, clean = true) {
    const item = this.itemMap[id]
    if (!item) {
      return
    }

    this.remove(item, clean)
  }

  toItemTree (parent) {
    const clonedParent = cloneDeep(parent)
    if (!this.hasChildren(parent)) {
      return undefined
    }
    const items = []
    for (const child of this.childrenIterator(parent)) {
      if (child instanceof SplitpaneTreeItem) {
        items.push(this.toItemTree(child))
      } else {
        items.push(cloneDeep(child))
      }
    }
    clonedParent.items = items
    return clonedParent
  }

  static fromItemTree (itemTree = {}) {
    const tree = new GSymbolTree({ horizontal: itemTree.horizontal })
    tree._addTreeItems(tree.root, itemTree.items)
    tree._clean()
    return tree
  }

  _addToItemMap (newItem) {
    if (newItem instanceof TreeItem) {
      const key = newItem.uuid
      Vue.set(this.itemMap, key, newItem)
    }
  }

  _removeFromItemMap (removeObject) {
    if (removeObject instanceof TreeItem) {
      const key = removeObject.uuid
      Vue.delete(this.itemMap, key)
    }
  }

  _moveToAndClean ({ sourceItem, targetItem, position }) {
    this._moveItemTo({ sourceItem, targetItem, position })

    this._clean()
  }

  _moveItemTo ({ sourceItem, targetItem, position }) {
    const targetParent = this.parent(targetItem)
    this.remove(sourceItem)
    switch (position) {
      case PositionEnum.TOP: {
        this._ensureSplitpaneOrientation({ horizontal: true, targetParent, targetItem })
        this.insertBefore(targetItem, sourceItem)
        break
      }
      case PositionEnum.BOTTOM: {
        this._ensureSplitpaneOrientation({ horizontal: true, targetParent, targetItem })
        this.insertAfter(targetItem, sourceItem)
        break
      }
      case PositionEnum.LEFT: {
        this._ensureSplitpaneOrientation({ horizontal: false, targetParent, targetItem })
        this.insertBefore(targetItem, sourceItem)
        break
      }
      case PositionEnum.RIGHT: {
        this._ensureSplitpaneOrientation({ horizontal: false, targetParent, targetItem })
        this.insertAfter(targetItem, sourceItem)
        break
      }
    }
  }

  /*
    _clean should be called when items are removed from the tree or moved to a different parent.
  */
  _clean (parent = this.root) {
    if (this.root !== parent) {
      if (this.childrenCount(parent) === 1) {
        const onlyChild = this.firstChild(parent)
        this.remove(onlyChild)
        this.insertBefore(parent, onlyChild)
        this.remove(parent)
      }
    }
    for (const child of this.childrenIterator(parent)) {
      this._clean(child)
    }
  }

  _ensureSplitpaneOrientation ({ horizontal, targetParent, targetItem }) {
    if (targetParent.horizontal === horizontal) {
      return
    }
    if (this.childrenCount(targetParent) === 1) {
      targetParent.horizontal = horizontal
      return
    }

    // set new splitpane with desired orientation at the position of the targetItem and place target item under new splitpane
    const splitpane = new SplitpaneTreeItem({ horizontal })
    this.insertBefore(targetItem, splitpane)
    targetParent = splitpane

    this.remove(targetItem)
    this.prependChild(targetParent, targetItem)
  }

  _addTreeItems (parent, items) {
    items = compact(items)
    if (!isEmpty(items)) {
      items.forEach(item => {
        const isSplitpaneTreeItem = item.hasOwnProperty('horizontal')
        const isTreeItem = !!item.uuid
        if (isSplitpaneTreeItem) {
          const splitpaneTreeItem = new SplitpaneTreeItem({ horizontal: item.horizontal })
          this.appendChild(parent, splitpaneTreeItem)
          this._addTreeItems(splitpaneTreeItem, item.items) // recursion
        } else if (isTreeItem) {
          this.appendChild(parent, new TreeItem({ uuid: item.uuid, data: item.data }))
        } // else: skip
      })
    }
  }
}
