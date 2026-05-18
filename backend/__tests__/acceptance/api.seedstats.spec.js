//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import request from '@gardener-dashboard/request'
import { Store } from '@gardener-dashboard/kube-client'
import cache from '../../lib/cache/index.js'

const { mockRequest } = request

function createStore (items) {
  const store = new Store()
  store.replace(items)
  return store
}

function seedShootsBySeedNameIndex (shoots = fixtures.shoots.list()) {
  const handlers = new Map()
  cache.indexShootsBySeedName({
    on (event, handler) {
      handlers.set(event, handler)
    },
  })
  const add = handlers.get('add')
  for (const shoot of shoots) {
    add(shoot)
  }
}

describe('api', function () {
  let agent

  beforeAll(async () => {
    agent = await createAgent()

    const shoots = fixtures.shoots.list()

    cache.initialize({
      seeds: {
        store: createStore(fixtures.seeds.list()),
      },
      shoots: {
        store: createStore(shoots),
      },
    })
    seedShootsBySeedNameIndex(shoots)
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  describe('seedstats', function () {
    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    it('should return stats for all seeds', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/seedstats?unhealthyFilterMask=0')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          apiVersion: 'dashboard.gardener.cloud/v1alpha1',
          kind: 'SeedStat',
          metadata: expect.objectContaining({ name: 'infra1-seed' }),
          counts: {
            shootCount: 3,
            unhealthyShoots: {
              total: 0,
              matching: 0,
            },
          },
        }),
      ]))
    })

    it('should return stats for one seed', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/seedstats/infra1-seed?unhealthyFilterMask=0')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(res.body).toEqual(expect.objectContaining({
        metadata: {
          name: 'infra1-seed',
          uid: 'seed--infra1-seed',
        },
        counts: {
          shootCount: 3,
          unhealthyShoots: {
            total: 0,
            matching: 0,
          },
        },
      }))
    })

    it('should forbid listing seed stats without full access', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

      const res = await agent
        .get('/api/seedstats?unhealthyFilterMask=0')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(res.body).toEqual(expect.objectContaining({
        code: 403,
        reason: 'Forbidden',
        message: 'You are not allowed to list seed stats',
      }))
    })

    it('should reject requests without unhealthyFilterMask', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/seedstats')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(res.body).toEqual(expect.objectContaining({
        code: 422,
        reason: 'Unprocessable Entity',
        message: "The 'unhealthyFilterMask' query parameter must be a non-negative integer with no bits set outside the known flags (0–7)",
      }))
    })
  })
})
