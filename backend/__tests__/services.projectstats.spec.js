//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('../lib/cache/index.js', () => ({
  default: {
    findProjectByNamespace: vi.fn(),
    getProjectByUid: vi.fn(),
    getProjects: vi.fn(),
    getResourceQuotasByNamespace: vi.fn(),
    getShootsByNamespace: vi.fn(),
    getTicketCache: vi.fn(),
  },
}))

vi.mock('../lib/services/authorization.js', () => ({
  canListProjects: vi.fn(),
  canListResourceQuotas: vi.fn(),
  canListShoots: vi.fn(),
}))

vi.mock('../lib/logger/index.js', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const { default: cache } = await import('../lib/cache/index.js')
const { default: config } = await import('../lib/config/index.js')
const { default: logger } = await import('../lib/logger/index.js')
const authorization = await import('../lib/services/authorization.js')
const projectstats = await import('../lib/services/projectstats.js')
const { shouldCountAsUnhealthy } = await import('../lib/services/seedstats.js')

describe('services/projectstats', () => {
  const user = {
    id: 'user@example.org',
    groups: [],
  }
  const projects = [
    createProject('foo', { members: [user.id] }),
    createProject('bar'),
    createProject('pending', { members: [user.id], phase: 'Pending' }),
  ]
  const shoots = {
    'garden-foo': [
      createShoot('garden-foo', 'healthy', { name: 'healthy' }),
      createShoot('garden-foo', 'unhealthy', { name: 'unhealthy' }),
    ],
    'garden-bar': [],
  }
  const resourceQuotas = {
    'garden-foo': [
      createResourceQuota('garden-foo', { hard: '2k', used: '1k' }),
      createResourceQuota('garden-foo', { hard: '1500', used: '1200' }),
    ],
    'garden-bar': [],
  }
  const globalScope = {
    canListAllProjectStats: true,
    projectStatNamespaces: new Set(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    cache.getProjects.mockReturnValue(projects)
    cache.getProjectByUid.mockImplementation(uid => projects.find(project => project.metadata.uid === uid))
    cache.getShootsByNamespace.mockImplementation(namespace => shoots[namespace] ?? [])
    cache.getResourceQuotasByNamespace.mockImplementation(namespace => resourceQuotas[namespace] ?? [])
    authorization.canListProjects.mockResolvedValue(true)
    authorization.canListShoots.mockResolvedValue(true)
    authorization.canListResourceQuotas.mockResolvedValue(true)
  })

  it('computes shoot health buckets and the effective shoot quota', () => {
    expect(projectstats.getByUids(['foo-uid', 'bar-uid'], globalScope)).toEqual([
      {
        apiVersion: 'dashboard.gardener.cloud/v1alpha1',
        kind: 'ProjectStat',
        metadata: {
          name: 'foo',
          uid: 'foo-uid',
        },
        counts: {
          shootCount: 2,
          unhealthyShoots: {
            byExclusion: [1, 0, 0, 0, 0, 0, 0, 0],
          },
        },
        shootQuota: {
          hard: 1500,
          used: 1200,
        },
      },
      {
        apiVersion: 'dashboard.gardener.cloud/v1alpha1',
        kind: 'ProjectStat',
        metadata: {
          name: 'bar',
          uid: 'bar-uid',
        },
        counts: {
          shootCount: 0,
          unhealthyShoots: {
            byExclusion: [0, 0, 0, 0, 0, 0, 0, 0],
          },
        },
      },
    ])
  })

  describe('unhealthy shoot buckets', () => {
    const originalTicketConfig = config.frontend.ticket
    const userError = [{ codes: ['ERR_CONFIGURATION_PROBLEM'] }]
    const bucketShoots = [
      createShoot('garden-foo', 'healthy', { name: 'healthy' }),
      createShoot('garden-foo', 'healthy', { name: 'healthy-hidden', ignoreIssues: true }),
      createShoot('garden-foo', 'unhealthy', { name: 'plain-1' }),
      createShoot('garden-foo', 'unhealthy', { name: 'plain-2' }),
      createShoot('garden-foo', 'unhealthy', { name: 'partly-hidden' }),
      createShoot('garden-foo', 'progressing', { name: 'progressing' }),
      createShoot('garden-foo', 'unhealthy', { name: 'temporary', status: { lastErrors: [{ codes: ['ERR_INFRA_RATE_LIMITS_EXCEEDED'] }] } }),
      createShoot('garden-foo', 'progressing', { name: 'progressing-user', status: { constraints: userError } }),
      createShoot('garden-foo', 'unhealthy', { name: 'hidden' }),
      createShoot('garden-foo', 'progressing', { name: 'progressing-hidden' }),
      createShoot('garden-foo', 'unhealthy', { name: 'ignored-hidden', ignoreIssues: true }),
      createShoot('garden-foo', 'progressing', { name: 'all-hidden', status: { conditions: userError } }),
    ]
    const ticketLabels = {
      'healthy-hidden': [['suppress']],
      'plain-2': [['customer-visible']],
      'partly-hidden': [['suppress'], ['customer-visible']],
      hidden: [['suppress']],
      'progressing-hidden': [['suppress', 'customer-visible']],
      'ignored-hidden': [['suppress']],
      'all-hidden': [['suppress']],
    }

    beforeEach(() => {
      config.frontend.ticket = { hideClustersWithLabels: ['suppress'] }
      cache.getShootsByNamespace.mockImplementation(namespace => namespace === 'garden-foo' ? bucketShoots : [])
      cache.findProjectByNamespace.mockReturnValue({ metadata: { name: 'foo' } })
      cache.getTicketCache.mockReturnValue({
        getIssuesForShoot: ({ name }) => (ticketLabels[name] ?? []).map(labels => ({
          data: { labels: labels.map(name => ({ name })) },
        })),
      })
    })

    afterEach(() => {
      config.frontend.ticket = originalTicketConfig
    })

    it('counts unhealthy shoots by every exclusion-bit combination', () => {
      const [stat] = projectstats.getByUids(['foo-uid'], globalScope)

      expect(stat.counts).toEqual({
        shootCount: 12,
        unhealthyShoots: {
          byExclusion: [3, 1, 1, 1, 1, 1, 1, 1],
        },
      })
    })

    it.each([0, 1, 2, 3, 4, 5, 6, 7])('agrees with shouldCountAsUnhealthy for mask %s', mask => {
      const [stat] = projectstats.getByUids(['foo-uid'], globalScope)
      const { byExclusion } = stat.counts.unhealthyShoots
      const unhealthyShoots = bucketShoots.filter(shoot => shoot.metadata.labels['shoot.gardener.cloud/status'] !== 'healthy')

      expect(byExclusion.reduce((sum, count) => sum + count, 0)).toBe(unhealthyShoots.length)
      expect(sumBuckets(byExclusion, mask)).toBe(unhealthyShoots.filter(shoot => shouldCountAsUnhealthy(shoot, mask)).length)
    })
  })

  it('establishes global access with fresh Project, Shoot, and ResourceQuota reviews', async () => {
    await expect(projectstats.resolveProjectStatScope(user)).resolves.toEqual(globalScope)

    expect(authorization.canListProjects).toHaveBeenCalledExactlyOnceWith(user)
    expect(authorization.canListShoots).toHaveBeenCalledExactlyOnceWith(user)
    expect(authorization.canListResourceQuotas).toHaveBeenCalledExactlyOnceWith(user)
  })

  it('falls back to authorized member namespaces when global access is unavailable', async () => {
    authorization.canListShoots.mockImplementation((candidate, namespace) => Promise.resolve(Boolean(namespace)))

    await expect(projectstats.resolveProjectStatScope(user)).resolves.toEqual({
      canListAllProjectStats: false,
      projectStatNamespaces: new Set(['garden-foo']),
    })
    expect(authorization.canListShoots.mock.calls).toEqual([
      [user],
      [user, 'garden-foo'],
    ])
    expect(authorization.canListResourceQuotas.mock.calls).toEqual([
      [user],
      [user, 'garden-foo'],
    ])
  })

  it('does not review namespaces of non-member Projects', async () => {
    cache.getProjects.mockReturnValue([createProject('bar')])
    authorization.canListProjects.mockResolvedValue(false)

    await expect(projectstats.resolveProjectStatScope(user)).resolves.toEqual({
      canListAllProjectStats: false,
      projectStatNamespaces: new Set(),
    })
    expect(authorization.canListShoots).not.toHaveBeenCalled()
    expect(authorization.canListResourceQuotas).not.toHaveBeenCalled()
  })

  it.each([
    ['both permissions are allowed', true, true, true],
    ['Shoot permission is denied', false, true, false],
    ['ResourceQuota permission is denied', true, false, false],
    ['both permissions are denied', false, false, false],
  ])('grants member scope only when %s', async (_, canListShoots, canListResourceQuotas, allowed) => {
    authorization.canListProjects.mockResolvedValue(false)
    authorization.canListShoots.mockResolvedValue(canListShoots)
    authorization.canListResourceQuotas.mockResolvedValue(canListResourceQuotas)

    const scope = await projectstats.resolveProjectStatScope(user)

    expect(scope.projectStatNamespaces).toEqual(new Set(allowed ? ['garden-foo'] : []))
    expect(authorization.canListShoots).toHaveBeenCalledExactlyOnceWith(user, 'garden-foo')
    expect(authorization.canListResourceQuotas).toHaveBeenCalledExactlyOnceWith(user, 'garden-foo')
  })

  it.each([
    ['Shoot', 'canListShoots'],
    ['ResourceQuota', 'canListResourceQuotas'],
  ])('fails closed when the %s namespace review errors', async (_, rejectedReview) => {
    authorization.canListProjects.mockResolvedValue(false)
    authorization[rejectedReview].mockRejectedValue(new Error('apiserver unavailable'))

    const scope = await projectstats.resolveProjectStatScope(user)

    expect(scope.projectStatNamespaces).toEqual(new Set())
    expect(authorization.canListShoots).toHaveBeenCalledExactlyOnceWith(user, 'garden-foo')
    expect(authorization.canListResourceQuotas).toHaveBeenCalledExactlyOnceWith(user, 'garden-foo')
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      user.id,
      'garden-foo',
      'apiserver unavailable',
    )
  })

  it('limits concurrent member namespace access reviews to 10 Projects', async () => {
    const tracker = createConcurrencyTracker(true)
    cache.getProjects.mockReturnValue(createMemberProjects(25, user.id))
    authorization.canListProjects.mockResolvedValue(false)
    authorization.canListShoots.mockImplementation(tracker.call)

    const scope = await projectstats.resolveProjectStatScope(user)

    expect(scope.projectStatNamespaces).toHaveProperty('size', 25)
    expect(tracker.max).toBe(10)
  })

  it.each([
    ['Shoot', 'canListShoots', 'canListResourceQuotas'],
    ['ResourceQuota', 'canListResourceQuotas', 'canListShoots'],
  ])('keeps the concurrency slot until the companion of a rejected %s review settles', async (_, rejectedReview, pendingReview) => {
    const pendingReviews = []
    cache.getProjects.mockReturnValue(createMemberProjects(25, user.id))
    authorization.canListProjects.mockResolvedValue(false)
    authorization[rejectedReview].mockRejectedValue(new Error('review failed'))
    authorization[pendingReview].mockImplementation(() => new Promise(resolve => pendingReviews.push(resolve)))

    const scopePromise = projectstats.resolveProjectStatScope(user)

    await vi.waitFor(() => expect(authorization[pendingReview]).toHaveBeenCalledTimes(10))
    expect(authorization[rejectedReview]).toHaveBeenCalledTimes(10)

    settlePendingReviews(pendingReviews)
    await vi.waitFor(() => expect(authorization[pendingReview]).toHaveBeenCalledTimes(20))
    settlePendingReviews(pendingReviews)
    await vi.waitFor(() => expect(authorization[pendingReview]).toHaveBeenCalledTimes(25))
    settlePendingReviews(pendingReviews)

    await expect(scopePromise).resolves.toMatchObject({
      projectStatNamespaces: new Set(),
    })
  })

  it('uses only the committed room scope for synchronized UIDs', () => {
    const result = projectstats.getByUids(
      ['foo-uid', 'bar-uid', 'pending-uid', 'missing-uid'],
      {
        canListAllProjectStats: false,
        projectStatNamespaces: new Set(['garden-foo']),
      },
    )

    expect(result[0]?.metadata.uid).toBe('foo-uid')
    expect(result.slice(1)).toEqual([undefined, undefined, undefined])
    expect(authorization.canListProjects).not.toHaveBeenCalled()
    expect(authorization.canListShoots).not.toHaveBeenCalled()
    expect(authorization.canListResourceQuotas).not.toHaveBeenCalled()
  })

  it('omits invalid Shoot quotas and parses Kubernetes quantity suffixes', () => {
    cache.getResourceQuotasByNamespace
      .mockReturnValueOnce([{
        status: {
          hard: { 'count/shoots': '10' },
          used: { 'count/shoots.core.gardener.cloud': 'not-a-number' },
        },
      }])
      .mockReturnValueOnce([createResourceQuota('garden-foo', { hard: '2Ki', used: '500m' })])

    expect(projectstats.getByUids(['foo-uid'], globalScope)[0]).not.toHaveProperty('shootQuota')
    expect(projectstats.getByUids(['foo-uid'], globalScope)[0].shootQuota).toEqual({
      hard: 2048,
      used: 0.5,
    })
  })
})

function createProject (name, { members = [], phase = 'Ready' } = {}) {
  return {
    metadata: {
      name,
      uid: `${name}-uid`,
    },
    spec: {
      namespace: `garden-${name}`,
      members: members.map(name => ({ kind: 'User', name })),
    },
    status: { phase },
  }
}

function createMemberProjects (count, member) {
  return Array.from({ length: count }, (_, index) => createProject(`member-${index}`, { members: [member] }))
}

function createConcurrencyTracker (result) {
  const tracker = {
    active: 0,
    max: 0,
    async call () {
      tracker.active += 1
      tracker.max = Math.max(tracker.max, tracker.active)
      await new Promise(resolve => setTimeout(resolve))
      tracker.active -= 1
      return result
    },
  }
  return tracker
}

function settlePendingReviews (pendingReviews) {
  for (const resolve of pendingReviews.splice(0)) {
    resolve(true)
  }
}

function createShoot (namespace, status, { name, ignoreIssues, status: shootStatus } = {}) {
  const shoot = {
    metadata: {
      namespace,
      name,
      labels: {
        'shoot.gardener.cloud/status': status,
      },
    },
  }
  if (ignoreIssues) {
    shoot.metadata.annotations = { 'dashboard.gardener.cloud/ignore-issues': 'true' }
  }
  if (shootStatus) {
    shoot.status = shootStatus
  }
  return shoot
}

function sumBuckets (byExclusion, mask) {
  return byExclusion.reduce((sum, count, bits) => (bits & mask) === 0 ? sum + count : sum, 0)
}

function createResourceQuota (namespace, { hard, used }) {
  return {
    metadata: { name: 'shoots', namespace },
    status: {
      hard: { 'count/shoots.core.gardener.cloud': hard },
      used: { 'count/shoots.core.gardener.cloud': used },
    },
  }
}
