//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'

vi.mock('../lib/cache/index.js', () => ({
  default: {
    getSeeds: vi.fn(),
    getSeed: vi.fn(),
    getSeedByUid: vi.fn(),
    getShoots: vi.fn(),
    getShootsBySeedName: vi.fn(),
    getTicketCache: vi.fn(),
    findProjectByNamespace: vi.fn(),
  },
}))

vi.mock('../lib/services/authorization.js', () => ({
  canListSeeds: vi.fn(),
  canListShoots: vi.fn(),
}))

const { default: cache } = await import('../lib/cache/index.js')
const { default: config } = await import('../lib/config/index.js')
const authorization = await import('../lib/services/authorization.js')
const seedstats = await import('../lib/services/seedstats.js')

describe('services/seedstats', () => {
  const user = { id: 'admin@example.org' }

  function createSeed ({ name, uid }) {
    return { metadata: { name, uid } }
  }

  function createShoot ({
    name,
    namespace,
    seed,
    status = 'unhealthy',
    errorCodes,
    ignored,
  } = {}) {
    const shoot = {
      spec: seed ? { seedName: seed } : {},
      metadata: {
        labels: {
          'shoot.gardener.cloud/status': status,
        },
      },
    }
    if (name) {
      shoot.metadata.name = name
    }
    if (namespace) {
      shoot.metadata.namespace = namespace
    }
    if (errorCodes) {
      shoot.status = { lastErrors: [{ codes: errorCodes }] }
    }
    if (ignored) {
      shoot.metadata.annotations = { 'shoot.gardener.cloud/ignore': 'true' }
    }
    return shoot
  }

  const seeds = [
    createSeed({ name: 'infra1-seed', uid: 'seed-1' }),
    createSeed({ name: 'infra2-seed', uid: 'seed-2' }),
  ]

  const shoots = [
    createShoot({ seed: 'infra1-seed', status: 'healthy' }),
    createShoot({ seed: 'infra1-seed' }),
    createShoot({ seed: 'infra1-seed', status: 'progressing', name: 'progressing-shoot', namespace: 'garden-foo' }),
    createShoot({ seed: 'infra1-seed', name: 'user-error-shoot', namespace: 'garden-foo', errorCodes: ['ERR_CONFIGURATION_PROBLEM'] }),
    createShoot({ seed: 'infra1-seed', name: 'temporary-error-shoot', namespace: 'garden-foo', errorCodes: ['ERR_INFRA_RATE_LIMITS_EXCEEDED'] }),
    createShoot({ seed: 'infra1-seed', name: 'deactivated-shoot', namespace: 'garden-foo', ignored: true }),
    createShoot({ seed: 'infra1-seed', name: 'hidden-ticket-shoot', namespace: 'garden-foo' }),
    createShoot({ seed: 'infra1-seed', name: 'visible-ticket-shoot', namespace: 'garden-foo' }),
    createShoot({ seed: 'infra2-seed' }),
    createShoot({ seed: 'unknown-seed' }),
    createShoot({}),
  ]

  const issues = [
    {
      metadata: {
        projectName: 'foo',
        name: 'hidden-ticket-shoot',
      },
      data: {
        labels: [{ name: 'suppress' }],
      },
    },
    {
      metadata: {
        projectName: 'foo',
        name: 'visible-ticket-shoot',
      },
      data: {
        labels: [{ name: 'customer-visible' }],
      },
    },
  ]

  const ticketCache = {
    getIssuesForShoot: vi.fn(({ name, projectName }) =>
      issues.filter(issue => issue.metadata.projectName === projectName && issue.metadata.name === name),
    ),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    ticketCache.getIssuesForShoot.mockImplementation(({ name, projectName }) =>
      issues.filter(issue => issue.metadata.projectName === projectName && issue.metadata.name === name),
    )
    config.frontend.ticket = {
      hideClustersWithLabels: ['suppress'],
    }
    authorization.canListSeeds.mockResolvedValue(true)
    authorization.canListShoots.mockResolvedValue(true)
    cache.getSeeds.mockReturnValue(seeds)
    cache.getShoots.mockReturnValue(shoots)
    cache.getShootsBySeedName.mockImplementation(seedName => shoots.filter(s => s?.spec?.seedName === seedName).values())
    cache.getSeed.mockImplementation(name => seeds.find(seed => seed.metadata.name === name))
    cache.getSeedByUid.mockImplementation(uid => seeds.find(seed => seed.metadata.uid === uid))
    cache.getTicketCache.mockReturnValue(ticketCache)
    cache.findProjectByNamespace.mockImplementation(namespace => {
      switch (namespace) {
        case 'garden-foo':
          return { metadata: { name: 'foo' } }
        case 'garden-bar':
          return { metadata: { name: 'bar' } }
        default:
          throw new Error(`Unknown namespace ${namespace}`)
      }
    })
  })

  it('should reject unauthorized users', async () => {
    authorization.canListShoots.mockResolvedValue(false)

    await expect(seedstats.list({ user, unhealthyFilterMask: 0 })).rejects.toEqual(expect.objectContaining({
      statusCode: 403,
      message: 'You are not allowed to list seed stats',
    }))
  })

  it('should reject a missing unhealthyFilterMask on list', async () => {
    await expect(seedstats.list({ user })).rejects.toEqual(expect.objectContaining({
      statusCode: 422,
      message: "The 'unhealthyFilterMask' query parameter must be a non-negative integer with no bits set outside the known flags (0–7)",
    }))
  })

  it('should reject an invalid unhealthyFilterMask on read', async () => {
    await expect(seedstats.read({ user, name: 'infra1-seed', unhealthyFilterMask: 'abc' })).rejects.toEqual(expect.objectContaining({
      statusCode: 422,
      message: "The 'unhealthyFilterMask' query parameter must be a non-negative integer with no bits set outside the known flags (0–7)",
    }))
  })

  it('should return stats for all seeds', async () => {
    const result = await seedstats.list({ user, unhealthyFilterMask: 0 })

    expect(result).toEqual([
      {
        apiVersion: 'dashboard.gardener.cloud/v1alpha1',
        kind: 'SeedStat',
        metadata: {
          name: 'infra1-seed',
          uid: 'seed-1',
        },
        counts: {
          shootCount: 8,
          unhealthyShoots: {
            total: 7,
            matching: 7,
          },
        },
      },
      {
        apiVersion: 'dashboard.gardener.cloud/v1alpha1',
        kind: 'SeedStat',
        metadata: {
          name: 'infra2-seed',
          uid: 'seed-2',
        },
        counts: {
          shootCount: 1,
          unhealthyShoots: {
            total: 1,
            matching: 1,
          },
        },
      },
    ])
  })

  it.each([
    [1, { total: 7, matching: 6 }],
    [2, { total: 7, matching: 5 }],
    [4, { total: 7, matching: 6 }],
    [7, { total: 7, matching: 3 }],
  ])('should apply unhealthyFilterMask %s', async (unhealthyFilterMask, unhealthyShoots) => {
    const result = await seedstats.read({ user, name: 'infra1-seed', unhealthyFilterMask })

    expect(result).toEqual(expect.objectContaining({
      counts: {
        shootCount: 8,
        unhealthyShoots,
      },
    }))
  })

  it('should return stats for a single seed', async () => {
    const result = await seedstats.read({ user, name: 'infra1-seed', unhealthyFilterMask: 0 })

    expect(result).toEqual({
      apiVersion: 'dashboard.gardener.cloud/v1alpha1',
      kind: 'SeedStat',
      metadata: {
        name: 'infra1-seed',
        uid: 'seed-1',
      },
      counts: {
        shootCount: 8,
        unhealthyShoots: {
          total: 7,
          matching: 7,
        },
      },
    })
  })

  it('should reject unknown seeds on read', async () => {
    await expect(seedstats.read({ user, name: 'does-not-exist', unhealthyFilterMask: 0 })).rejects.toEqual(expect.objectContaining({
      statusCode: 404,
      message: "Seed with name 'does-not-exist' not found",
    }))
  })

  it('should always return total unhealthy shoots greater than or equal to matching unhealthy shoots', async () => {
    for (const unhealthyFilterMask of [0, 1, 2, 4, 7]) {
      const result = await seedstats.read({ user, name: 'infra1-seed', unhealthyFilterMask })
      expect(result.counts.unhealthyShoots.total).toBeGreaterThanOrEqual(result.counts.unhealthyShoots.matching)
    }
  })
})
