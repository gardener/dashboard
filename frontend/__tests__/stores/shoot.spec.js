//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useApi } from '@/composables/useApi'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useProjectStore } from '@/store/project'
import { useSocketStore } from '@/store/socket'
import { parseSearch } from '@/store/shoot/helper'
import {
  cloneDeep,
  map,
} from '@/utils/lodash'

const noop = () => {}

describe('stores', () => {
  describe('shoot', () => {
    const notFound = Object.assign(new Error('Not found'), {
      response: {
        status: 404,
        data: {
          code: 404,
          message: 'Not found',
        },
      },
    })

    const api = useApi()
    let mockGetShoots // eslint-disable-line no-unused-vars
    let mockGetIssues // eslint-disable-line no-unused-vars
    let mockGetShoot // eslint-disable-line no-unused-vars
    let mockGetIssuesAndComments // eslint-disable-line no-unused-vars
    let mockGetShootInfo // eslint-disable-line no-unused-vars
    let mockEmitSubscribe // eslint-disable-line no-unused-vars
    let mockEmitUnsubscribe // eslint-disable-line no-unused-vars
    let authzStore
    let projectStore
    let socketStore
    let shootStore

    const shootList = [
      {
        metadata: {
          name: 'shoot2',
          namespace: 'foo',
          uid: '3',
        },
        spec: {
          creationTimestamp: '2020-01-01T20:00:00Z',
          kubernetes: {
            version: '1.0.0',
          },
          region: 'region1',
          provider: {
            type: 'infra1',
          },
          purpose: 'development',
        },
        status: {
          lastOperation: {
            progress: 100,
            state: 'Succeeded',
          },
          conditions: [
            {
              type: 'ObservabilityComponentsHealthy',
              status: 'True',
              lastTransitionTime: '2020-03-01T20:00:00Z',
            },
            {
              type: 'ControlPlaneHealthy',
              status: 'False',
              lastTransitionTime: '2020-01-01T20:00:00Z',
            },
          ],
        },
      },
      {
        metadata: {
          name: 'shoot1',
          namespace: 'foo',
          uid: '2',
        },
        spec: {
          creationTimestamp: '2020-02-01T20:00:00Z',
          kubernetes: {
            version: '1.1.0',
          },
          region: 'region1',
          provider: {
            type: 'infra2',
          },
          purpose: 'production',
        },
        status: {
          lastOperation: {
            progress: 90,
            state: 'Succeeded',
          },
          conditions: [
            {
              type: 'APIServerAvailable',
              status: 'False',
              lastTransitionTime: '2022-02-01T20:00:00Z',
            },
          ],
        },
      },
      {
        metadata: {
          name: 'shoot3',
          namespace: 'foo',
          uid: '1',
        },
        spec: {
          creationTimestamp: '2020-01-01T20:00:00Z',
          kubernetes: {
            version: '1.0.0',
          },
          region: 'region2',
          provider: {
            type: 'infra1',
          },
          purpose: 'development',
        },
        status: {
          lastOperation: {
            progress: 100,
            state: 'Succeeded',
          },
          lastErrors: [
            {
              description: 'bar',
            },
          ],
          conditions: [
            {
              type: 'APIServerAvailable',
              status: 'False',
              lastTransitionTime: '2022-01-01T20:00:00Z',
            },
          ],
        },
      },
    ]

    function setProjectData ({ shootCustomFields, ...data } = {}) {
      const annotations = {}
      if (shootCustomFields) {
        annotations['dashboard.gardener.cloud/shootCustomFields'] = JSON.stringify(shootCustomFields)
      }
      projectStore.list = [{
        metadata: {
          namespace: 'foo',
          annotations,
        },
        data,
      }]
    }

    beforeEach(() => {
      mockGetShoots = vi.spyOn(api, 'getShoots').mockResolvedValue({
        data: {
          items: cloneDeep(shootList),
        },
      })
      mockGetIssues = vi.spyOn(api, 'getIssues').mockResolvedValue({
        data: {
          issues: [],
        },
      })
      mockGetShoot = vi.spyOn(api, 'getShoot').mockResolvedValue({
        data: cloneDeep(shootList[0]),
      })
      mockGetIssuesAndComments = vi.spyOn(api, 'getIssuesAndComments').mockResolvedValue({
        data: {
          issues: [],
          comments: [],
        },
      })
      mockGetShootInfo = vi.spyOn(api, 'getShootInfo').mockRejectedValue(notFound)
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace('foo')
      projectStore = useProjectStore()
      setProjectData({
        shootCustomFields: {
          Foo: {
            name: 'Column uid',
            path: 'metadata.uid',
          },
        },
      })
      socketStore = useSocketStore()
      mockEmitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockImplementation(noop)
      mockEmitUnsubscribe = vi.spyOn(socketStore, 'emitUnsubscribe').mockImplementation(noop)
      shootStore = useShootStore()
      shootStore.setShootListFilters({
        onlyShootsWithIssues: false,
      })
    })

    describe('#sortItems', () => {
      let items

      beforeEach(() => {
        items = cloneDeep(shootList)
      })

      it('should sort shoots by name', () => {
        const sortBy = [{ key: 'name', order: 'desc' }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot3', 'shoot2', 'shoot1'])
      })

      it('should sort shoots by purpose', () => {
        const sortBy = [{ key: 'purpose', order: 'desc' }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot2', 'shoot3', 'shoot1'])
      })

      it('should sort shoots by creationTimestamp', () => {
        const sortBy = [{ key: 'creationTimestamp', order: 'asc' }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot1', 'shoot2', 'shoot3'])
      })

      it('should sort shoots by kubernetes version', () => {
        const sortBy = [{ key: 'k8sVersion', order: 'asc' }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot2', 'shoot3', 'shoot1'])
      })

      it('should sort shoots by infrastructure', () => {
        const sortBy = [{
          key: 'infrastructure',
          order: 'desc',
        }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot1', 'shoot3', 'shoot2'])
      })

      it('should sort shoots by lastOperation (status)', () => {
        const sortBy = [{
          key: 'lastOperation',
          order: 'desc',
        }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot2', 'shoot1', 'shoot3'])
      })

      it('should sort shoots by readiness', () => {
        const sortBy = [{
          key: 'readiness',
          order: 'asc',
        }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot3', 'shoot1', 'shoot2'])
      })

      it('should sort shoots by custom column', () => {
        const sortBy = [{
          key: 'Z_Foo',
          order: 'asc',
        }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot3', 'shoot1', 'shoot2'])
      })
    })

    describe('focus mode', () => {
      beforeEach(async () => {
        await shootStore.subscribe({ namespace: '_all' })
      })

      it('should mark no longer existing shoots as stale when shoot list is freezed', () => {
        shootStore.handleEvent({
          type: 'DELETED',
          object: shootStore.filteredShoots[0],
        })
        expect(shootStore.filteredShoots.length).toBe(2)
        expect(shootStore.shootList.length).toBe(2)
        expect(shootStore.shootList[0].stale).toBeUndefined()

        shootStore.setFocusMode(true)

        expect(shootStore.shootList[0].stale).toBeUndefined()
        shootStore.handleEvent({
          type: 'DELETED',
          object: shootStore.filteredShoots[0],
        })
        expect(shootStore.filteredShoots.length).toBe(1)
        expect(shootStore.shootList.length).toBe(2)
        expect(shootStore.shootList[0].stale).toBe(true)
      })

      it('should not add new shoots to list when shoot list is freezed', () => {
        shootStore.setFocusMode(true)
        shootStore.handleEvent({
          type: 'ADDED',
          object: {
            metadata: {
              name: 'shoot4',
              namespace: 'foo',
              uid: 'shoot4',
            },
          },
        })
        expect(shootStore.filteredShoots.length).toBe(4)
        expect(shootStore.sortedUidsAtFreeze.length).toBe(3)
        expect(shootStore.shootList.length).toBe(3)

        shootStore.setFocusMode(false)
        expect(shootStore.shootList.length).toBe(4)

        shootStore.setFocusMode(true)
        expect(shootStore.shootList.length).toBe(4)
      })

      it('should add and remove staleShoots', () => {
        const shoot = shootList[1]
        shootStore.setFocusMode(true)

        shootStore.handleEvent({
          type: 'DELETED',
          object: shoot,
        })
        expect(shootStore.staleShoots[shoot.metadata.uid]).toBeDefined()

        shootStore.handleEvent({
          type: 'ADDED',
          object: shoot,
        })
        expect(shootStore.staleShoots[shoot.metadata.uid]).toBeUndefined()
      })

      it('should receive items and update staleShoots', async () => {
        const deletedItem = shootList[0]
        const receivedItems = [shootList[0], shootList[1]]
        const missingItem = shootList[2]

        shootStore.setFocusMode(true)
        shootStore.handleEvent({
          type: 'DELETED',
          object: deletedItem,
        })

        expect(shootStore.sortedUidsAtFreeze.length).toBe(3)
        expect(shootStore.staleShoots[deletedItem.metadata.uid]).toBeDefined()
        expect(shootStore.filteredShoots.length).toBe(2)
        expect(map(shootStore.filteredShoots, 'metadata.name')).toEqual(['shoot1', 'shoot3'])

        mockGetShoots.mockResolvedValueOnce({
          data: {
            items: cloneDeep(receivedItems),
          },
        })
        await shootStore.synchronize()

        expect(shootStore.sortedUidsAtFreeze.length).toBe(3)
        expect(shootStore.staleShoots[missingItem.metadata.uid]).toBeDefined()
        expect(shootStore.staleShoots[deletedItem.metadata.uid]).toBeUndefined()
        expect(shootStore.filteredShoots.length).toBe(2)
        expect(map(shootStore.filteredShoots, 'metadata.name')).toEqual(['shoot2', 'shoot1'])
      })
    })
  })

  describe('helper', () => {
    describe('#parseSearch', () => {
      it('should parse search text', () => {
        const searchQuery = parseSearch('a "b""s" -"c" -d')
        expect(searchQuery.terms).toEqual([
          {
            exact: false,
            exclude: false,
            value: 'a',
          },
          {
            exact: true,
            exclude: false,
            value: 'b"s',
          },
          {
            exact: true,
            exclude: true,
            value: 'c',
          },
          {
            exact: false,
            exclude: true,
            value: 'd',
          },
        ])
      })

      it('should match values correctly', () => {
        const searchQuery = parseSearch('a "b""s" -"c" -d')
        expect(searchQuery.matches(['$a', 'b"s', '$c'])).toBe(true)
        expect(searchQuery.matches(['$a', 'b"s', '$d'])).toBe(false)
        expect(searchQuery.matches(['$a', 'b"s', 'c'])).toBe(false)
        expect(searchQuery.matches(['$a', '$b"s'])).toBe(false)
        expect(searchQuery.matches(['b"s'])).toBe(false)
      })
    })
  })
})
