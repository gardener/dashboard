//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { GSymbolTree, Leaf, SplitpaneTree, PositionEnum } from '@/lib/g-symbol-tree'
import cloneDeep from 'lodash/cloneDeep'

describe('lib', () => {
  describe('g-symbol-tree', () => {
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

    beforeEach(() => {
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
    })

    it('should assert that splitpaneTrees do not count', () => {
      expect(tree.items().length).toBe(5)
    })

    describe('#moveToWithId', () => {
      describe('position right', () => {
        it('should move b2 right to a', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })

          expect(tree.nextSibling(a)).toBe(b2)
          expect(tree.nextSibling(b2)).toBe(b)
          expect(tree.nextSibling(b1)).toBe(b3)
        })

        it('should move b2 right to b1 and should create a new SplitpaneTree', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.RIGHT })

          expect(tree.nextSibling(a)).toBe(b)
          expect(tree.firstChild(b)).toBeInstanceOf(SplitpaneTree)
          const newB1 = tree.firstChild(b)
          expect(b.horizontal).toBe(true)
          expect(newB1.horizontal).toBe(false)
          expect(tree.childrenCount(newB1)).toBe(2)
          expect(tree.childrenToArray(newB1)).toEqual([b1, b2])
        })
      })

      describe('position left', () => {
        it('should move b2 left to a', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.LEFT })

          expect(tree.previousSibling(a)).toBe(b2)
          expect(tree.nextSibling(b1)).toBe(b3)
        })

        it('should move b2 left to b1 and should create a new SplitpaneTree', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.LEFT })

          expect(tree.nextSibling(a)).toBe(b)
          expect(tree.firstChild(b)).toBeInstanceOf(SplitpaneTree)
          const newB1 = tree.firstChild(b)
          expect(b.horizontal).toBe(true)
          expect(newB1.horizontal).toBe(false)
          expect(tree.childrenCount(newB1)).toBe(2)
          expect(tree.childrenToArray(newB1)).toEqual([b2, b1])
        })
      })

      describe('position bottom', () => {
        it('should move b2 below b3', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b3.uuid, position: PositionEnum.BOTTOM })

          expect(tree.firstChild(b)).toBe(b1)
          expect(tree.nextSibling(b1)).toBe(b3)
          expect(tree.nextSibling(b3)).toBe(b2)
        })

        it('should move b2 below a and should create a new SplitpaneTree', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.BOTTOM })

          expect(tree.previousSibling(b)).toBeInstanceOf(SplitpaneTree)
          const newA = tree.previousSibling(b)
          expect(tree.root.horizontal).toBe(false)
          expect(newA.horizontal).toBe(true)
          expect(tree.childrenCount(newA)).toBe(2)
          expect(tree.childrenToArray(newA)).toEqual([a, b2])
        })

        it('should leave a2 where it is when moving below a1', () => {
          const splitpaneTree = {
            horizontal: false,
            items: [{
              horizontal: true,
              items: [{
                uuid: 'a1',
                data: undefined,
              }, {
                uuid: 'a2',
                data: undefined,
              }],
            }, {
              uuid: 'b1',
              data: undefined,
            }],
          }
          const expectedSplitpaneTree = cloneDeep(splitpaneTree)
          const newTree = GSymbolTree.fromJSON(splitpaneTree)
          newTree.moveToWithId({ sourceId: 'a2', targetId: 'a1', position: PositionEnum.BOTTOM })
          expect(newTree.toJSON(newTree.root)).toEqual(expectedSplitpaneTree)
        })
      })

      describe('position top', () => {
        it('should move b2 above b1', () => {
          tree.moveToWithId({ sourceId: b2.uuid, targetId: b1.uuid, position: PositionEnum.TOP })

          expect(tree.firstChild(b)).toBe(b2)
          expect(tree.nextSibling(b2)).toBe(b1)
          expect(tree.nextSibling(b1)).toBe(b3)
        })

        it(
          'should move b2 above a and should create a new SplitpaneTree',
          () => {
            tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.TOP })

            expect(tree.previousSibling(b)).toBeInstanceOf(SplitpaneTree)
            const newA = tree.previousSibling(b)
            expect(newA.horizontal).toBe(true)
            expect(tree.childrenCount(newA)).toBe(2)
            expect(tree.childrenToArray(newA)).toEqual([b2, a])
            expect(tree.childrenCount(b)).toBe(2)
          },
        )

        it('should leave a1 where it is when moving above a2', () => {
          const splitpaneTree = {
            horizontal: false,
            items: [{
              horizontal: true,
              items: [{
                uuid: 'a1',
                data: undefined,
              }, {
                uuid: 'a2',
                data: undefined,
              }],
            }, {
              uuid: 'b1',
              data: undefined,
            }],
          }
          const expectedSplitpaneTree = cloneDeep(splitpaneTree)
          const newTree = GSymbolTree.fromJSON(splitpaneTree)
          newTree.moveToWithId({ sourceId: 'a1', targetId: 'a2', position: PositionEnum.TOP })

          expect(newTree.toJSON(newTree.root)).toEqual(expectedSplitpaneTree)
        })
      })
    })

    describe('#isEmpty', () => {
      it('should be empty', () => {
        expect(tree.isEmpty()).toBe(false)

        const ids = tree.ids()

        tree.removeWithIds(ids)

        expect(tree.isEmpty()).toBe(true)
        expect(tree.nextSibling(tree.root)).toBeNull()
      })
    })

    describe('#cleanUp', () => {
      it(
        'should move all children of b under tree root and cleanup b',
        () => {
          tree.moveToWithId({ sourceId: b1.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })
          tree.moveToWithId({ sourceId: b2.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })
          tree.moveToWithId({ sourceId: b3.uuid, targetId: a.uuid, position: PositionEnum.RIGHT })

          expect(tree.childrenCount(tree.root)).toBe(5) // a, b3, b2, b1, c
          expect(tree.nextSibling(a)).toBe(b3)
          expect(tree.nextSibling(b3)).toBe(b2)
          expect(tree.nextSibling(b2)).toBe(b1)
          expect(tree.nextSibling(b1)).toBe(c)
        },
      )

      it('should cleanup b', () => {
        tree.remove(b1)
        tree.remove(b2)

        expect(tree.nextSibling(a)).toBe(b3) // b should be cleaned up as it contained only one child

        tree.remove(b3)

        expect(tree.childrenCount(tree.root)).toBe(2)
        expect(tree.items().length).toBe(2)
        expect(tree.nextSibling(a)).toBe(c)
      })

      it('should cleanup root with only one `SplitpaneTree` child', () => {
        const splitpaneTree = {
          horizontal: true,
          items: [{
            horizontal: false,
            items: [{
              uuid: 'b1',
              data: undefined,
            }, {
              uuid: 'b2',
              data: undefined,
            }],
          }],
        }
        const expectedSplitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'b1',
            data: undefined,
          }, {
            uuid: 'b2',
            data: undefined,
          }],
        }
        const newTree = GSymbolTree.fromJSON(splitpaneTree)

        expect(newTree.toJSON(newTree.root)).toEqual(expectedSplitpaneTree)
      })

      it('should not cleanup root with only one `Leaf` child', () => {
        const splitpaneTree = {
          horizontal: true,
          items: [{
            uuid: 'b1',
            data: undefined,
          }],
        }
        const expectedSplitpaneTree = cloneDeep(splitpaneTree)
        const newTree = GSymbolTree.fromJSON(splitpaneTree)

        expect(newTree.toJSON(newTree.root)).toEqual(expectedSplitpaneTree)
      })
    })

    describe('#lastChild', () => {
      it('should return last child', () => {
        let lastChild = tree.lastChild(tree.root, false)
        let lastChildRecoursive = tree.lastChild(tree.root, true)
        expect(lastChild).toBe(c)
        expect(lastChildRecoursive).toBe(c)

        const c1 = new Leaf({ uuid: 'c1' })
        const c2 = new Leaf({ uuid: 'c2' })
        tree.appendChild(c, c1)
        tree.appendChild(c, c2)

        lastChild = tree.lastChild(tree.root, false)
        lastChildRecoursive = tree.lastChild(tree.root, true)
        expect(lastChild).toBe(c)
        expect(lastChildRecoursive).toBe(c2)
      })

      it('should return undefined for empty tree', () => {
        const emptyTree = new GSymbolTree()

        expect(emptyTree.lastChild(emptyTree.root, false)).toBeNull()
        expect(emptyTree.lastChild(emptyTree.root, true)).toBeNull()
      })
    })

    describe('#toJSON', () => {
      it('should create item-tree from tree', () => {
        const splitpaneTree = tree.toJSON(tree.root)

        const expectedSplitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'a',
            data: undefined,
          }, {
            horizontal: true,
            items: [{
              uuid: 'b1',
              data: undefined,
            }, {
              uuid: 'b2',
              data: undefined,
            }, {
              uuid: 'b3',
              data: undefined,
            }],
          }, {
            uuid: 'c',
            data: undefined,
          }],
        }
        expect(splitpaneTree).toEqual(expectedSplitpaneTree)
      })

      it('should return undefined for empty tree', () => {
        const newTree = new GSymbolTree()
        const splitpaneTree = newTree.toJSON(newTree.root)

        expect(splitpaneTree).toBeUndefined()
      })

      it('should return undefined for tree without `Leaf`s', () => {
        const newTree = new GSymbolTree()
        const splitpane1 = new SplitpaneTree()
        const splitpane2 = new SplitpaneTree()
        newTree.appendChild(newTree.root, splitpane1)
        newTree.appendChild(splitpane1, splitpane2)
        const splitpaneTree = newTree.toJSON(newTree.root)

        expect(splitpaneTree).toBeUndefined()
      })
    })

    describe('#fromJSON', () => {
      it('should create tree from item-tree', () => {
        const splitpaneTree = tree.toJSON(tree.root)
        const tmp = GSymbolTree.fromJSON(splitpaneTree)

        const actualSplitpaneTree = tmp.toJSON(tmp.root)

        expect(actualSplitpaneTree).toEqual(splitpaneTree)
      })

      it('should skip invalid items', () => {
        let splitpaneTree = {}
        let tree = GSymbolTree.fromJSON(splitpaneTree)
        expect(tree.isEmpty()).toBe(true)
        expect(tree.firstChild(tree.root)).toBeNull()

        splitpaneTree = undefined
        tree = GSymbolTree.fromJSON(splitpaneTree)
        expect(tree.isEmpty()).toBe(true)
        expect(tree.firstChild(tree.root)).toBeNull()

        splitpaneTree = {
          horizontal: false,
          items: [
            { uuid: 'valid-item' },
            {
              horizontal: true,
              items: undefined,
            },
            {},
            { uuid: undefined },
            { uuid: '' },
            undefined,
          ],
        }
        const expectedSplitpaneTree = {
          horizontal: false,
          items: [{
            uuid: 'valid-item',
            data: undefined,
          }],
        }
        tree = GSymbolTree.fromJSON(splitpaneTree)
        expect(tree.items()).toHaveLength(1)
        expect(tree.toJSON(tree.root)).toEqual(expectedSplitpaneTree)
      })
    })
  })
})
