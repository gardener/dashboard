//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useProjectStore } from '@/store/project'
import { useSocketStore } from '@/store/socket'
import { parseSearch } from '@/store/shoot/helper'

import { useApi } from '@/composables/useApi'

import cloneDeep from 'lodash/cloneDeep'
import map from 'lodash/map'
import find from 'lodash/find'

const globalSetImmediate = global.setImmediate

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
    let mockGetShoots
    /* eslint-disable no-unused-vars */
    let mockGetIssues
    let mockGetShoot
    let mockGetIssuesAndComments
    let mockGetShootInfo
    let mockEmitSubscribe
    let mockEmitUnsubscribe
    let mockSynchronize
    /* eslint-enable no-unused-vars */
    let authnStore
    let authzStore
    let projectStore
    let socketStore
    let shootStore

    const flushEvents = () => {
      shootStore.state.subscriptionEventHandler.flush()
      return new Promise(resolve => globalSetImmediate(resolve))
    }

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
          annotations,
        },
        spec: {
          namespace: 'foo',
        },
      }]
    }

    beforeEach(() => {
      setActivePinia(createPinia())

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

      authnStore = useAuthnStore()
      authnStore.user = {
        isAdmin: false,
        email: 'john.doe@example.org',
      }
      authzStore = useAuthzStore()
      authzStore.setNamespace('foo')
      projectStore = useProjectStore()
      setProjectData({
        shootCustomFields: [
          {
            name: 'Column uid',
            path: 'metadata.uid',
          },
        ],
      })
      socketStore = useSocketStore()
      shootStore = useShootStore()

      mockEmitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockImplementation(noop)
      mockEmitUnsubscribe = vi.spyOn(socketStore, 'emitUnsubscribe').mockImplementation(noop)
      const getShoots = uids => map(uids, uid => {
        return find(shootList, ['metadata.uid', uid]) ?? {
          metadata: {
            name: `shoot${uid}`,
            namespace: 'foo',
            uid: `${uid}`,
          },
        }
      })
      mockSynchronize = vi.spyOn(socketStore, 'synchronize').mockImplementation((key, uids) => Promise.resolve(getShoots(uids)))
      shootStore.initializeShootListFilters()
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
          key: 'Z_columnUid',
          order: 'asc',
        }]
        const sortedShoots = shootStore.sortItems(items, sortBy)
        expect(map(sortedShoots, 'metadata.name')).toEqual(['shoot3', 'shoot1', 'shoot2'])
      })
    })

    describe('focus mode', () => {
      let uid

      beforeEach(async () => {
        await shootStore.subscribe({ namespace: '_all' })
      })

      it('should mark no longer existing shoots as stale when shoot list is freezed', async () => {
        uid = shootStore.activeShoots[0].metadata.uid
        expect(shootStore.isShootActive(uid)).toBe(true)
        shootStore.handleEvent({
          type: 'DELETED',
          uid,
        })
        await flushEvents()
        expect(shootStore.activeShoots).toHaveLength(2)
        expect(shootStore.shootList).toHaveLength(2)
        expect(shootStore.isShootActive(uid)).toBe(false)
        expect(shootStore.staleShoots[uid]).toBeUndefined()

        shootStore.setFocusMode(true)

        uid = shootStore.activeShoots[0].metadata.uid
        expect(shootStore.isShootActive(uid)).toBe(true)
        shootStore.handleEvent({
          type: 'DELETED',
          uid,
        })
        await flushEvents()
        expect(shootStore.activeShoots).toHaveLength(1)
        expect(shootStore.shootList).toHaveLength(2)
        expect(shootStore.isShootActive(uid)).toBe(false)
        expect(shootStore.staleShoots[uid]).toBeDefined()
      })

      it('should not add new shoots to list when shoot list is freezed', async () => {
        uid = 4
        shootStore.setFocusMode(true)
        shootStore.handleEvent({
          type: 'ADDED',
          uid,
        })
        await flushEvents()
        expect(shootStore.activeShoots).toHaveLength(4)
        expect(shootStore.state.froozenUids).toHaveLength(3)
        expect(shootStore.shootList).toHaveLength(3)

        shootStore.setFocusMode(false)
        expect(shootStore.shootList).toHaveLength(4)

        shootStore.setFocusMode(true)
        expect(shootStore.shootList).toHaveLength(4)
      })

      it('should add and remove staleShoots', async () => {
        const shoot = shootList[1]
        uid = shoot.metadata.uid
        shootStore.setFocusMode(true)

        shootStore.handleEvent({
          type: 'DELETED',
          uid,
        })
        await flushEvents()
        expect(shootStore.staleShoots[uid]).toEqual(shoot)

        shootStore.handleEvent({
          type: 'ADDED',
          uid,
        })
        await flushEvents()
        expect(shootStore.staleShoots[uid]).toBeUndefined()
      })

      it('should receive items and update staleShoots', async () => {
        const deletedItem = shootList[0]
        const receivedItems = [shootList[0], shootList[1]]
        const missingItem = shootList[2]

        shootStore.setFocusMode(true)
        shootStore.handleEvent({
          type: 'DELETED',
          uid: deletedItem.metadata.uid,
        })
        await flushEvents()
        expect(shootStore.state.froozenUids).toHaveLength(3)
        expect(shootStore.staleShoots[deletedItem.metadata.uid]).toBeDefined()
        expect(shootStore.activeShoots).toHaveLength(2)
        expect(map(shootStore.activeShoots, 'metadata.name').sort()).toEqual([
          'shoot1',
          'shoot3',
        ])

        mockGetShoots.mockResolvedValueOnce({
          data: {
            items: cloneDeep(receivedItems),
          },
        })
        await shootStore.synchronize()

        expect(shootStore.state.froozenUids).toHaveLength(3)
        expect(shootStore.staleShoots[missingItem.metadata.uid]).toEqual(missingItem)
        expect(shootStore.staleShoots[deletedItem.metadata.uid]).toBeUndefined()
        expect(shootStore.activeShoots).toHaveLength(2)
        expect(map(shootStore.activeShoots, 'metadata.name').sort()).toEqual([
          'shoot1',
          'shoot2',
        ])
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
