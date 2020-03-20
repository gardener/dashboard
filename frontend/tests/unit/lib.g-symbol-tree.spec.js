//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
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

import { expect } from 'chai'
import { GSymbolTree, Leaf, SplitpaneTree, PositionEnum } from '@/lib/g-symbol-tree'
import cloneDeep from 'lodash/cloneDeep'

describe('lib', function () {
  describe('g-symbol-tree', function () {
    /* Tree:
    root (horizontal false)
      - a
      - b (horizontal true)
        - b1
        - b2
        - b3
      - c
    */
    let tree, a, b, c, b1, b2, b3

    beforeEach(function () {
      a = new Leaf({ uuid: 'a' })
      b = new SplitpaneTree({ horizontal: true })
      c = new Leaf({ uuid: 'c' })

      b1 = new Leaf({ uuid: 'b1' })
      b2 = new Leaf({ uuid: 'b2' })
      b3 = new Leaf({ uuid: 'b3' })

      tree = new GSymbolTree({ horizontal: false })
      tree.appendChild(tree.root, a)
      tree.appendChild(tree.root, b)
      tree.appendChild(tree.root, c)

      tree.appendChild(b, b1)
      tree.appendChild(b, b2)
      tree.appendChild(b, b3)

      expect(tree.items().length).to.be.equal(5) // SplitpaneTree's do not count
    })

    describe('#moveToWithId', function () {
      describe('position right', function () {
        it('should move b2 right to a', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })

          expect(tree.nextSibling(a)).is.equal(b2)
          expect(tree.nextSibling(b2)).is.equal(b)
          expect(tree.nextSibling(b1)).is.equal(b3)
        })

        it('should move b2 right to b1 and should create a new SplitpaneTree', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.RIGHT })

          expect(tree.nextSibling(a)).is.equal(b)
          expect(tree.firstChild(b)).is.instanceOf(SplitpaneTree)
          const newB1 = tree.firstChild(b)
          expect(b.horizontal).to.be.true
          expect(newB1.horizontal).to.be.false
          expect(tree.childrenCount(newB1)).to.be.equal(2)
          expect(tree.childrenToArray(newB1)).to.eql([b1, b2])
        })
      })

      describe('position left', function () {
        it('should move b2 left to a', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.LEFT })

          expect(tree.previousSibling(a)).is.equal(b2)
          expect(tree.nextSibling(b1)).is.equal(b3)
        })

        it('should move b2 left to b1 and should create a new SplitpaneTree', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.LEFT })

          expect(tree.nextSibling(a)).is.equal(b)
          expect(tree.firstChild(b)).is.instanceOf(SplitpaneTree)
          const newB1 = tree.firstChild(b)
          expect(b.horizontal).to.be.true
          expect(newB1.horizontal).to.be.false
          expect(tree.childrenCount(newB1)).to.be.equal(2)
          expect(tree.childrenToArray(newB1)).to.eql([b2, b1])
        })
      })

      describe('position bottom', function () {
        it('should move b2 below b3', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b3.uuid, position: PositionEnum.BOTTOM })

          expect(tree.firstChild(b)).is.equal(b1)
          expect(tree.nextSibling(b1)).is.equal(b3)
          expect(tree.nextSibling(b3)).is.equal(b2)
        })

        it('should move b2 below a and should create a new SplitpaneTree', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.BOTTOM })

          expect(tree.previousSibling(b)).is.instanceOf(SplitpaneTree)
          const newA = tree.previousSibling(b)
          expect(tree.root.horizontal).to.be.false
          expect(newA.horizontal).to.be.true
          expect(tree.childrenCount(newA)).to.be.equal(2)
          expect(tree.childrenToArray(newA)).to.eql([a, b2])
        })

        it('should leave a2 where it is when moving below a1', function () {
          const splitpaneTree = {
            horizontal: false,
            items: [{
              horizontal: true,
              items: [{
                uuid: 'a1',
                data: undefined
              }, {
                uuid: 'a2',
                data: undefined
              }]
            }, {
              uuid: 'b1',
              data: undefined
            }]
          }
          const expectedSplitpaneTree = cloneDeep(splitpaneTree)
          const newTree = GSymbolTree.fromJSON(splitpaneTree)
          newTree.moveToWithId({ sourceId: 'a2', targetId: 'a1', position: PositionEnum.BOTTOM })

          expect(newTree.toJSON(newTree.root)).to.eql(expectedSplitpaneTree)
        })
      })

      describe('position top', function () {
        it('should move b2 above b1', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.TOP })

          expect(tree.firstChild(b)).is.equal(b2)
          expect(tree.nextSibling(b2)).is.equal(b1)
          expect(tree.nextSibling(b1)).is.equal(b3)
        })

        it('should move b2 above a and should create a new SplitpaneTree', function () {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.TOP })

          expect(tree.previousSibling(b)).is.instanceOf(SplitpaneTree)
          const newA = tree.previousSibling(b)
          expect(newA.horizontal).to.be.true
          expect(tree.childrenCount(newA)).to.be.equal(2)
          expect(tree.childrenToArray(newA)).to.eql([b2, a])
          expect(tree.childrenCount(b)).to.be.equal(2)
        })

        it('should leave a1 where it is when moving above a2', function () {
          const splitpaneTree = {
            horizontal: false,
            items: [{
              horizontal: true,
              items: [{
                uuid: 'a1',
                data: undefined
              }, {
                uuid: 'a2',
                data: undefined
              }]
            }, {
              uuid: 'b1',
              data: undefined
            }]
          }
          const expectedSplitpaneTree = cloneDeep(splitpaneTree)
          const newTree = GSymbolTree.fromJSON(splitpaneTree)
          newTree.moveToWithId({ sourceId: 'a1', targetId: 'a2', position: PositionEnum.TOP })

          expect(newTree.toJSON(newTree.root)).to.eql(expectedSplitpaneTree)
        })
      })
    })

    describe('#isEmpty', function () {
      it('should be empty', function () {
        expect(tree.isEmpty()).to.be.false

        const ids = tree.ids()

        tree.removeWithIds(ids)

        expect(tree.isEmpty()).to.be.true
        expect(tree.nextSibling(tree.root)).to.be.null
      })
    })

    describe('#cleanUp', function () {
      it('should move all children of b under tree root and cleanup b', function () {
        tree.moveToWithId({ sourceId: b1.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })
        tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })
        tree.moveToWithId({ sourceId: b3.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })

        expect(tree.childrenCount(tree.root)).is.equal(5) // a, b3, b2, b1, c
        expect(tree.nextSibling(a)).is.equal(b3)
        expect(tree.nextSibling(b3)).is.equal(b2)
        expect(tree.nextSibling(b2)).is.equal(b1)
        expect(tree.nextSibling(b1)).is.equal(c)
      })

      it('should cleanup b', function () {
        tree.remove(b1)
        tree.remove(b2)

        expect(tree.nextSibling(a)).is.equal(b3) // b should be cleaned up as it contained only one child

        tree.remove(b3)

        expect(tree.childrenCount(tree.root)).to.be.equal(2)
        expect(tree.items().length).to.be.equal(2)
        expect(tree.nextSibling(a)).is.equal(c)
      })

      it('should cleanup root with only one `SplitpaneTree` child', function () {
        const splitpaneTree = {
          horizontal: true,
          items: [{
            horizontal: false,
            items: [{
              uuid: 'b1',
              data: undefined
            }, {
              uuid: 'b2',
              data: undefined
            }]
          }]
        }
        const expectedSplitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'b1',
            data: undefined
          }, {
            uuid: 'b2',
            data: undefined
          }]
        }
        const newTree = GSymbolTree.fromJSON(splitpaneTree)

        expect(newTree.toJSON(newTree.root)).to.eql(expectedSplitpaneTree)
      })

      it('should not cleanup root with only one `Leaf` child', function () {
        const splitpaneTree = {
          horizontal: true,
          items: [{
            uuid: 'b1',
            data: undefined
          }]
        }
        const expectedSplitpaneTree = cloneDeep(splitpaneTree)
        const newTree = GSymbolTree.fromJSON(splitpaneTree)

        expect(newTree.toJSON(newTree.root)).to.eql(expectedSplitpaneTree)
      })
    })

    describe('#lastChild', function () {
      it('should return last child', function () {
        let lastChild = tree.lastChild(tree.root, false)
        let lastChildRecoursive = tree.lastChild(tree.root, true)
        expect(lastChild).to.be.equal(c)
        expect(lastChildRecoursive).to.be.equal(c)

        const c1 = new Leaf({ uuid: 'c1' })
        const c2 = new Leaf({ uuid: 'c2' })
        tree.appendChild(c, c1)
        tree.appendChild(c, c2)

        lastChild = tree.lastChild(tree.root, false)
        lastChildRecoursive = tree.lastChild(tree.root, true)
        expect(lastChild).to.be.equal(c)
        expect(lastChildRecoursive).to.be.equal(c2)
      })

      it('should return undefined for empty tree', function () {
        const emptyTree = new GSymbolTree()

        expect(emptyTree.lastChild(emptyTree.root, false)).to.be.null
        expect(emptyTree.lastChild(emptyTree.root, true)).to.be.null
      })
    })

    describe('#toJSON', function () {
      it('should create item-tree from tree', function () {
        const splitpaneTree = tree.toJSON(tree.root)

        const expectedSplitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'a',
            data: undefined
          }, {
            horizontal: true,
            items: [{
              uuid: 'b1',
              data: undefined
            }, {
              uuid: 'b2',
              data: undefined
            }, {
              uuid: 'b3',
              data: undefined
            }]
          }, {
            uuid: 'c',
            data: undefined
          }]
        }
        expect(splitpaneTree).to.eql(expectedSplitpaneTree)
      })

      it('should return undefined for empty tree', function () {
        const newTree = new GSymbolTree()
        const splitpaneTree = newTree.toJSON(newTree.root)

        expect(splitpaneTree).to.be.undefined
      })

      it('should return undefined for tree without `Leaf`s', function () {
        const newTree = new GSymbolTree()
        const splitpane1 = new SplitpaneTree()
        const splitpane2 = new SplitpaneTree()
        newTree.appendChild(newTree.root, splitpane1)
        newTree.appendChild(splitpane1, splitpane2)
        const splitpaneTree = newTree.toJSON(newTree.root)

        expect(splitpaneTree).to.be.undefined
      })
    })

    describe('#fromJSON', function () {
      it('should create tree from item-tree', function () {
        const splitpaneTree = tree.toJSON(tree.root)
        const tmp = GSymbolTree.fromJSON(splitpaneTree)

        const actualSplitpaneTree = tmp.toJSON(tmp.root)

        expect(actualSplitpaneTree).to.eql(splitpaneTree)
      })

      it('should skip invalid items', function () {
        let splitpaneTree = {}
        let tmp = GSymbolTree.fromJSON(splitpaneTree)
        expect(tmp.isEmpty()).to.be.true
        expect(tmp.firstChild(tmp.root)).to.be.null

        splitpaneTree = undefined
        tmp = GSymbolTree.fromJSON(splitpaneTree)
        expect(tmp.isEmpty()).to.be.true
        expect(tmp.firstChild(tmp.root)).to.be.null

        splitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'valid-item'
          }, {
            horizontal: true,
            items: undefined
          },
          {},
          { uuid: undefined },
          { uuid: '' },
          undefined]
        }
        tmp = GSymbolTree.fromJSON(splitpaneTree)
        expect(tmp.items().length).to.be.equal(1)
        expect(tmp.items()).to.eql([new Leaf({ uuid: 'valid-item' })])
      })
    })
  })
})
