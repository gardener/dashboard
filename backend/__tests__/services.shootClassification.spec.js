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
    getTicketCache: vi.fn(),
  },
}))

vi.mock('../lib/logger/index.js', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const { default: cache } = await import('../lib/cache/index.js')
const { default: config } = await import('../lib/config/index.js')
const { default: logger } = await import('../lib/logger/index.js')
const {
  ALL_UNHEALTHY_FILTER_FLAGS,
  FILTER_HIDE_TICKETS,
  FILTER_NO_OPERATOR_ACTION,
  FILTER_PROGRESSING,
  exclusionBits,
  shouldCountAsUnhealthy,
} = await import('../lib/services/shootClassification.js')

describe('services/shootClassification', () => {
  const originalTicketConfig = config.frontend.ticket
  const userError = [{ codes: ['ERR_CONFIGURATION_PROBLEM'] }]
  const ticketLabels = {
    hidden: [['suppress']],
    visible: [['customer-visible']],
    'partly-hidden': [['suppress'], ['customer-visible']],
  }

  beforeEach(() => {
    vi.resetAllMocks()
    config.frontend.ticket = { hideClustersWithLabels: ['suppress'] }
    cache.findProjectByNamespace.mockReturnValue({ metadata: { name: 'foo' } })
    cache.getTicketCache.mockReturnValue({
      getIssuesForShoot: ({ projectName, name }) => projectName === 'foo'
        ? (ticketLabels[name] ?? []).map(labels => ({ data: { labels: labels.map(label => ({ name: label })) } }))
        : [],
    })
  })

  afterEach(() => {
    config.frontend.ticket = originalTicketConfig
  })

  it('uses the bit values of the unhealthy filter mask', () => {
    expect([FILTER_PROGRESSING, FILTER_NO_OPERATOR_ACTION, FILTER_HIDE_TICKETS]).toEqual([1, 2, 4])
  })

  it.each([
    ['an unhealthy shoot', {}, 0],
    ['a progressing shoot', { status: 'progressing' }, FILTER_PROGRESSING],
    ['ignored issues', { ignoreIssues: 'true' }, FILTER_NO_OPERATOR_ACTION],
    ['a temporary last error', { lastErrors: [{ codes: ['ERR_INFRA_RATE_LIMITS_EXCEEDED'] }] }, FILTER_NO_OPERATOR_ACTION],
    ['a user-caused last error', { lastErrors: userError }, FILTER_NO_OPERATOR_ACTION],
    ['a user-caused condition error', { conditions: userError }, FILTER_NO_OPERATOR_ACTION],
    ['a user-caused constraint error', { constraints: userError }, FILTER_NO_OPERATOR_ACTION],
    ['an operator error', { lastErrors: [{ codes: ['ERR_INFRA_UNKNOWN'] }] }, 0],
    ['only tickets with a hide label', { name: 'hidden' }, FILTER_HIDE_TICKETS],
    ['a ticket without a hide label', { name: 'visible' }, 0],
    ['a ticket without a hide label next to a hidden one', { name: 'partly-hidden' }, 0],
  ])('classifies %s', (_, options, bits) => {
    expect(exclusionBits(createShoot(options))).toBe(bits)
  })

  it.each([
    [{ status: 'progressing', lastErrors: userError }, FILTER_PROGRESSING | FILTER_NO_OPERATOR_ACTION],
    [{ status: 'progressing', name: 'hidden' }, FILTER_PROGRESSING | FILTER_HIDE_TICKETS],
    [{ ignoreIssues: 'true', name: 'hidden' }, FILTER_NO_OPERATOR_ACTION | FILTER_HIDE_TICKETS],
    [{ status: 'progressing', constraints: userError, name: 'hidden' }, FILTER_PROGRESSING | FILTER_NO_OPERATOR_ACTION | FILTER_HIDE_TICKETS],
  ])('evaluates all categories of %j', (options, bits) => {
    expect(exclusionBits(createShoot(options))).toBe(bits)
  })

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('counts a shoot for mask %s only if none of its exclusion bits is enabled', mask => {
    const shoots = [
      {},
      { status: 'progressing' },
      { lastErrors: userError },
      { name: 'hidden' },
      { name: 'visible' },
      { status: 'progressing', lastErrors: userError },
      { status: 'progressing', name: 'hidden' },
      { ignoreIssues: 'true', name: 'hidden' },
      { status: 'progressing', constraints: userError, name: 'hidden' },
    ].map(createShoot)

    expect(shoots.map(shoot => shouldCountAsUnhealthy(shoot, mask)))
      .toEqual(shoots.map(shoot => (exclusionBits(shoot) & mask) === 0))
  })

  it.each([
    ['the ticket filter is disabled', { name: 'hidden' }, FILTER_PROGRESSING | FILTER_NO_OPERATOR_ACTION, true],
    ['a progressing shoot is already excluded', { status: 'progressing', name: 'hidden' }, ALL_UNHEALTHY_FILTER_FLAGS, false],
    ['a shoot without operator action is already excluded', { lastErrors: userError, name: 'hidden' }, ALL_UNHEALTHY_FILTER_FLAGS, false],
  ])('does not look up tickets to count a shoot when %s', (_, options, mask, expected) => {
    expect(shouldCountAsUnhealthy(createShoot(options), mask)).toBe(expected)
    expect(cache.findProjectByNamespace).not.toHaveBeenCalled()
    expect(cache.getTicketCache).not.toHaveBeenCalled()
  })

  it.each([
    ['not configured', undefined],
    ['empty', []],
  ])('never sets the ticket category when hide labels are %s', (_, hideClustersWithLabels) => {
    config.frontend.ticket = { hideClustersWithLabels }

    expect(exclusionBits(createShoot({ status: 'progressing', name: 'hidden' }))).toBe(FILTER_PROGRESSING)
    expect(cache.getTicketCache).not.toHaveBeenCalled()
  })

  it('does not set the ticket category when the Project of the shoot is unknown', () => {
    cache.findProjectByNamespace.mockImplementation(() => {
      throw new Error('Namespace garden-foo is not related to a gardener project')
    })

    expect(exclusionBits(createShoot({ name: 'hidden' }))).toBe(0)
    expect(logger.warn).toHaveBeenCalledOnce()
  })
})

function createShoot ({
  name = 'shoot',
  status = 'unhealthy',
  ignoreIssues,
  lastErrors,
  conditions,
  constraints,
} = {}) {
  const shoot = {
    metadata: {
      namespace: 'garden-foo',
      name,
      labels: { 'shoot.gardener.cloud/status': status },
    },
    status: { lastErrors, conditions, constraints },
  }
  if (ignoreIssues) {
    shoot.metadata.annotations = { 'dashboard.gardener.cloud/ignore-issues': ignoreIssues }
  }
  return shoot
}
