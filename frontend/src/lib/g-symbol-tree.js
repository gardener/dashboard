//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import keys from 'lodash/keys'
import compact from 'lodash/compact'
import values from 'lodash/values'
import SymbolTree from 'symbol-tree'
const { v4: uuidv4 } = require('uuid')

export const PositionEnum = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
}

export class Leaf {
  constructor ({ uuid = uuidv4(), data } = {}) {
    this.uuid = uuid
    this.data = data
  }

  toJSON () {
    return {
      uuid: this.uuid,
      data: this.data
    }
  }
}

export class SplitpaneTree {
  constructor ({ horizontal = false } = {}) {
    this.horizontal = horizontal
  }

  toJSON () {
    return {
      horizontal: this.horizontal
    }
  }
}

export class GSymbolTree extends SymbolTree {
  constructor ({ description, horizontal = false } = {}) {
    super(description)

    this.itemMap = {}
    this.root = new SplitpaneTree({ horizontal })
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
      this._clean(this.root)
    }
  }

  lastChild (object, recursive = false) {
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

    this._clean(this.root)
  }

  removeWithId (id, clean = true) {
    const item = this.itemMap[id]
    if (!item) {
      return
    }

    this.remove(item, clean)
  }

  toJSON (parent) {
    if (!this.hasChildren(parent)) {
      return undefined
    }
    const clonedParent = parent.toJSON()
    const items = []
    for (const child of this.childrenIterator(parent)) {
      if (child instanceof SplitpaneTree) {
        items.push(this.toJSON(child))
      } else {
        items.push(child.toJSON())
      }
    }
    clonedParent.items = compact(items)
    if (isEmpty(clonedParent.items)) {
      return undefined
    }
    return clonedParent
  }

  static fromJSON (splitpaneTree = {}) {
    const tree = new GSymbolTree({ horizontal: splitpaneTree.horizontal })
    tree._addItems(tree.root, splitpaneTree.items)
    tree._clean(tree.root)
    return tree
  }

  _addToItemMap (newItem) {
    if (newItem instanceof Leaf) {
      const key = newItem.uuid
      Vue.set(this.itemMap, key, newItem)
    }
  }

  _removeFromItemMap (removeObject) {
    if (removeObject instanceof Leaf) {
      const key = removeObject.uuid
      Vue.delete(this.itemMap, key)
    }
  }

  _moveToAndClean ({ sourceItem, targetItem, position }) {
    this._moveItemTo({ sourceItem, targetItem, position })

    this._clean(this.root)
  }

  _moveItemTo ({ sourceItem, targetItem, position }) {
    const targetParent = this.parent(targetItem)
    this.remove(sourceItem, false)
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
  _clean (parent) {
    if (this.childrenCount(parent) === 1) {
      const onlyChild = this.firstChild(parent)
      if (this.root !== parent || (this.root === parent && onlyChild instanceof SplitpaneTree)) {
        if (this.root === parent) {
          this.root = onlyChild
        }
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
    const splitpane = new SplitpaneTree({ horizontal })
    this.insertBefore(targetItem, splitpane)
    targetParent = splitpane

    this.remove(targetItem)
    this.prependChild(targetParent, targetItem)
  }

  _addItems (parent, items) {
    items = compact(items)
    if (!isEmpty(items)) {
      items.forEach(item => {
        const isSplitpaneTree = Reflect.has(item, 'horizontal')
        const isLeaf = !!item.uuid
        if (isSplitpaneTree) {
          const splitpaneTree = new SplitpaneTree({ horizontal: item.horizontal })
          this.appendChild(parent, splitpaneTree)
          this._addItems(splitpaneTree, item.items) // recursion
        } else if (isLeaf) {
          this.appendChild(parent, new Leaf({ uuid: item.uuid, data: item.data }))
        } // else: skip
      })
    }
  }
}
