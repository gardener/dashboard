//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'
import { useShootStore } from '@/store/shoot'
import { parseShootSearch } from '@/store/shoot/helper'
import {
  SHOOT_ALL_TICKETS_IGNORED_FALSE,
  SHOOT_ALL_TICKETS_IGNORED_TRUE,
  SHOOT_HEALTH_UNHEALTHY,
  SHOOT_OPERATOR_ACTION_TRUE,
  SHOOT_PROGRESSING_TRUE,
  buildSearchTerms,
  hasAllTicketsIgnoredSearchTerm,
  hasHealthSearchTerm,
  hasOperatorActionSearchTerm,
  hasProgressingSearchTerm,
  resolveShootListFiltersForDonut,
  resolveShootListFiltersFromSearch,
} from '@/store/shoot/search'
import { useTicketStore } from '@/store/ticket'

describe('Shoot search', () => {
  let configStore
  let shootStore
  let ticketStore

  function createShoot ({
    name,
    uid,
    health,
    annotations,
    status = {},
  }) {
    return {
      metadata: {
        name,
        namespace: 'foo',
        uid,
        annotations,
        labels: {
          'shoot.gardener.cloud/status': health,
        },
      },
      spec: {
        provider: {},
      },
      status,
    }
  }

  function createIssue ({
    name,
    number,
    labels,
  }) {
    return {
      metadata: {
        name,
        number,
        projectName: 'foo',
        updated_at: '2026-01-01T00:00:00Z',
      },
      data: {
        labels: labels.map((label, index) => ({
          id: index + 1,
          name: label,
        })),
      },
    }
  }

  function matchingNames (search, shoots) {
    const predicate = shootStore.searchItems(search)
    return shoots.filter(predicate).map(shoot => shoot.metadata.name)
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    const projectStore = useProjectStore()
    projectStore.list = [{
      metadata: {
        name: 'foo',
      },
      spec: {
        namespace: 'foo',
      },
    }]

    configStore = useConfigStore()
    ticketStore = useTicketStore()
    shootStore = useShootStore()
  })

  it('excludes typed fields from free-text matching', () => {
    const shoots = [
      createShoot({ name: 'alpha-shoot', uid: 'healthy', health: 'healthy' }),
      createShoot({ name: 'beta-shoot', uid: 'unhealthy', health: 'unhealthy' }),
    ]

    expect(matchingNames('any', shoots)).toEqual([])
  })

  it('normalizes and matches health terms', () => {
    const shoots = [
      createShoot({ name: 'healthy-shoot', uid: 'healthy', health: 'healthy' }),
      createShoot({ name: 'unhealthy-shoot', uid: 'unhealthy', health: 'unhealthy' }),
    ]
    const cases = [
      {
        search: 'health:unhealthy',
        term: { field: 'health', value: 'unhealthy', exact: false, exclude: false },
        names: ['unhealthy-shoot'],
      },
      {
        search: '-health:healthy',
        term: { field: 'health', value: 'unhealthy', exact: false, exclude: false },
        names: ['unhealthy-shoot'],
      },
      {
        search: 'health:any',
        term: { field: 'health', value: 'any', exact: false, exclude: false },
        names: ['healthy-shoot', 'unhealthy-shoot'],
      },
      {
        search: 'health:none',
        term: { field: 'health', value: 'none', exact: false, exclude: false },
        names: [],
      },
      {
        search: 'health:"healthy"',
        term: { field: 'health', value: 'healthy', exact: true, exclude: false },
        names: ['healthy-shoot'],
      },
      {
        search: '-health:unknown',
        term: { field: 'health', value: 'unknown', exact: false, exclude: true },
        names: ['healthy-shoot', 'unhealthy-shoot'],
      },
    ]

    for (const { search, term, names } of cases) {
      const query = parseShootSearch(search)
      expect(query.terms).toEqual([term])
      expect(matchingNames(search, shoots)).toEqual(names)
    }

    const query = parseShootSearch('health:unhealthy -health:healthy')
    expect(query.terms).toEqual([
      { field: 'health', value: 'unhealthy', exact: false, exclude: false },
      { field: 'health', value: 'unhealthy', exact: false, exclude: false },
    ])
    expect(hasHealthSearchTerm(query, SHOOT_HEALTH_UNHEALTHY)).toBe(true)
  })

  it('normalizes and matches progressing terms', () => {
    const shoots = [
      createShoot({ name: 'progressing-shoot', uid: 'progressing', health: 'progressing' }),
      createShoot({ name: 'unhealthy-shoot', uid: 'unhealthy', health: 'unhealthy' }),
    ]
    const cases = [
      {
        search: 'progressing:true',
        term: { field: 'progressing', value: 'true', exact: false, exclude: false },
        names: ['progressing-shoot'],
      },
      {
        search: '-progressing:false',
        term: { field: 'progressing', value: 'true', exact: false, exclude: false },
        names: ['progressing-shoot'],
      },
      {
        search: 'progressing:false',
        term: { field: 'progressing', value: 'false', exact: false, exclude: false },
        names: ['unhealthy-shoot'],
      },
      {
        search: 'progressing:any',
        term: { field: 'progressing', value: 'any', exact: false, exclude: false },
        names: ['progressing-shoot', 'unhealthy-shoot'],
      },
      {
        search: 'progressing:none',
        term: { field: 'progressing', value: 'none', exact: false, exclude: false },
        names: [],
      },
    ]

    for (const { search, term, names } of cases) {
      const query = parseShootSearch(search)
      expect(query.terms).toEqual([term])
      expect(matchingNames(search, shoots)).toEqual(names)
    }

    expect(hasProgressingSearchTerm(
      parseShootSearch('-progressing:false'),
      SHOOT_PROGRESSING_TRUE,
    )).toBe(true)
  })

  it('normalizes and matches operator-action terms', () => {
    const shoots = [
      createShoot({
        name: 'operator-action-shoot',
        uid: 'operator-action',
        health: 'unhealthy',
      }),
      createShoot({
        name: 'user-error-shoot',
        uid: 'user-error',
        health: 'unhealthy',
        status: {
          lastErrors: [{
            codes: ['ERR_CONFIGURATION_PROBLEM'],
          }],
        },
      }),
    ]
    const cases = [
      {
        search: 'operatorAction:true',
        term: { field: 'operatorAction', value: 'true', exact: false, exclude: false },
        names: ['operator-action-shoot'],
      },
      {
        search: '-operatorAction:false',
        term: { field: 'operatorAction', value: 'true', exact: false, exclude: false },
        names: ['operator-action-shoot'],
      },
      {
        search: 'operatorAction:false',
        term: { field: 'operatorAction', value: 'false', exact: false, exclude: false },
        names: ['user-error-shoot'],
      },
      {
        search: 'operatorAction:any',
        term: { field: 'operatorAction', value: 'any', exact: false, exclude: false },
        names: ['operator-action-shoot', 'user-error-shoot'],
      },
      {
        search: 'operatorAction:none',
        term: { field: 'operatorAction', value: 'none', exact: false, exclude: false },
        names: [],
      },
    ]

    for (const { search, term, names } of cases) {
      const query = parseShootSearch(search)
      expect(query.terms).toEqual([term])
      expect(matchingNames(search, shoots)).toEqual(names)
    }

    expect(hasOperatorActionSearchTerm(
      parseShootSearch('-operatorAction:false'),
      SHOOT_OPERATOR_ACTION_TRUE,
    )).toBe(true)
  })

  it('does not match healthy shoots for operatorAction:true', () => {
    const shoots = [
      createShoot({
        name: 'healthy-shoot',
        uid: 'healthy',
        health: 'healthy',
      }),
      createShoot({
        name: 'operator-action-shoot',
        uid: 'operator-action',
        health: 'unhealthy',
      }),
    ]

    expect(matchingNames('operatorAction:true', shoots)).toEqual(['operator-action-shoot'])
  })

  it('normalizes and matches all-tickets-ignored terms', () => {
    configStore.setConfiguration({
      ticket: {
        gitHubRepoUrl: 'https://github.com/org/repo',
        hideClustersWithLabels: ['ignore'],
      },
    })
    const shoots = [
      createShoot({ name: 'ignored-ticket-shoot', uid: 'ignored-ticket', health: 'unhealthy' }),
      createShoot({ name: 'visible-ticket-shoot', uid: 'visible-ticket', health: 'unhealthy' }),
    ]
    ticketStore.receiveIssues([
      createIssue({
        name: 'ignored-ticket-shoot',
        number: 1,
        labels: ['ignore'],
      }),
      createIssue({
        name: 'visible-ticket-shoot',
        number: 2,
        labels: ['needs-attention'],
      }),
    ])
    const cases = [
      {
        search: 'allTicketsIgnored:true',
        term: { field: 'allTicketsIgnored', value: 'true', exact: false, exclude: false },
        names: ['ignored-ticket-shoot'],
      },
      {
        search: '-allTicketsIgnored:false',
        term: { field: 'allTicketsIgnored', value: 'true', exact: false, exclude: false },
        names: ['ignored-ticket-shoot'],
      },
      {
        search: 'allTicketsIgnored:false',
        term: { field: 'allTicketsIgnored', value: 'false', exact: false, exclude: false },
        names: ['visible-ticket-shoot'],
      },
      {
        search: 'allTicketsIgnored:any',
        term: { field: 'allTicketsIgnored', value: 'any', exact: false, exclude: false },
        names: ['ignored-ticket-shoot', 'visible-ticket-shoot'],
      },
      {
        search: 'allTicketsIgnored:none',
        term: { field: 'allTicketsIgnored', value: 'none', exact: false, exclude: false },
        names: [],
      },
    ]

    for (const { search, term, names } of cases) {
      const query = parseShootSearch(search)
      expect(query.terms).toEqual([term])
      expect(matchingNames(search, shoots)).toEqual(names)
    }

    expect(hasAllTicketsIgnoredSearchTerm(
      parseShootSearch('-allTicketsIgnored:false'),
      SHOOT_ALL_TICKETS_IGNORED_TRUE,
    )).toBe(true)
  })

  it('canonicalizes negated any and none values', () => {
    expect(parseShootSearch('-health:any').terms).toEqual([
      { field: 'health', value: 'none', exact: false, exclude: false },
    ])
    expect(parseShootSearch('-progressing:none').terms).toEqual([
      { field: 'progressing', value: 'any', exact: false, exclude: false },
    ])
  })

  it('builds the Operations View query from filter values', () => {
    expect(buildSearchTerms()).toBe('')
    expect(buildSearchTerms({
      healthy: false,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })).toBe('')
    expect(buildSearchTerms({
      healthy: true,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })).toBe(
      'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false',
    )
  })

  it('resolves filter values from a typed query', () => {
    const query = parseShootSearch(
      'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false',
    )

    expect(resolveShootListFiltersFromSearch(query)).toEqual({
      healthy: true,
      unhealthy: false,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })
    expect(hasAllTicketsIgnoredSearchTerm(
      query,
      SHOOT_ALL_TICKETS_IGNORED_FALSE,
    )).toBe(true)
  })

  it('resolves donut refinements only for an active unhealthy view', () => {
    expect(resolveShootListFiltersForDonut({
      healthy: false,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })).toEqual({
      healthy: true,
      unhealthy: false,
      progressing: false,
      operatorAction: false,
      allTicketsIgnored: false,
    })
    expect(resolveShootListFiltersForDonut({
      healthy: true,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })).toEqual({
      healthy: true,
      unhealthy: false,
      progressing: true,
      operatorAction: true,
      allTicketsIgnored: true,
    })
  })
})
