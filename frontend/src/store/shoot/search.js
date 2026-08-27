//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { SearchQuery } from '@/composables/useTableFilter/helper'

import get from 'lodash/get'

export const SHOOT_HEALTH_FIELD = 'health'
export const SHOOT_HEALTH_ANY = 'any'
export const SHOOT_HEALTH_HEALTHY = 'healthy'
export const SHOOT_HEALTH_UNHEALTHY = 'unhealthy'
export const SHOOT_HEALTH_NONE = 'none'

export const SHOOT_PROGRESSING_FIELD = 'progressing'
export const SHOOT_PROGRESSING_ANY = 'any'
export const SHOOT_PROGRESSING_TRUE = 'true'
export const SHOOT_PROGRESSING_FALSE = 'false'
export const SHOOT_PROGRESSING_NONE = 'none'

export const SHOOT_OPERATOR_ACTION_FIELD = 'operatorAction'
export const SHOOT_OPERATOR_ACTION_ANY = 'any'
export const SHOOT_OPERATOR_ACTION_TRUE = 'true'
export const SHOOT_OPERATOR_ACTION_FALSE = 'false'
export const SHOOT_OPERATOR_ACTION_NONE = 'none'

export const SHOOT_ALL_TICKETS_IGNORED_FIELD = 'allTicketsIgnored'
export const SHOOT_ALL_TICKETS_IGNORED_ANY = 'any'
export const SHOOT_ALL_TICKETS_IGNORED_TRUE = 'true'
export const SHOOT_ALL_TICKETS_IGNORED_FALSE = 'false'
export const SHOOT_ALL_TICKETS_IGNORED_NONE = 'none'

export const SHOOT_UNHEALTHY_LABEL_SELECTOR = 'shoot.gardener.cloud/status!=healthy'

function createNegationValues (any, positive, negative, none) {
  return new Map([
    [any, none],
    [positive, negative],
    [negative, positive],
    [none, any],
  ])
}

const NEGATION_VALUE_BY_FIELD = new Map([
  [SHOOT_HEALTH_FIELD, createNegationValues(
    SHOOT_HEALTH_ANY,
    SHOOT_HEALTH_HEALTHY,
    SHOOT_HEALTH_UNHEALTHY,
    SHOOT_HEALTH_NONE,
  )],
  [SHOOT_PROGRESSING_FIELD, createNegationValues(
    SHOOT_PROGRESSING_ANY,
    SHOOT_PROGRESSING_TRUE,
    SHOOT_PROGRESSING_FALSE,
    SHOOT_PROGRESSING_NONE,
  )],
  [SHOOT_OPERATOR_ACTION_FIELD, createNegationValues(
    SHOOT_OPERATOR_ACTION_ANY,
    SHOOT_OPERATOR_ACTION_TRUE,
    SHOOT_OPERATOR_ACTION_FALSE,
    SHOOT_OPERATOR_ACTION_NONE,
  )],
  [SHOOT_ALL_TICKETS_IGNORED_FIELD, createNegationValues(
    SHOOT_ALL_TICKETS_IGNORED_ANY,
    SHOOT_ALL_TICKETS_IGNORED_TRUE,
    SHOOT_ALL_TICKETS_IGNORED_FALSE,
    SHOOT_ALL_TICKETS_IGNORED_NONE,
  )],
])

function canonicalNegationValue (term) {
  return NEGATION_VALUE_BY_FIELD.get(term.field)?.get(term.value)
}

function normalizeNegatedTerm (term) {
  if (!term.exclude) {
    return term
  }

  const canonicalValue = canonicalNegationValue(term)
  if (canonicalValue === undefined) {
    return term
  }

  return {
    ...term,
    value: canonicalValue,
    exclude: false,
  }
}

export function normalizeShootSearch (query) {
  const terms = (query?.terms ?? []).map(normalizeNegatedTerm)
  return new SearchQuery(terms)
}

export function hasSearchTerm (query, field, value) {
  return query?.terms?.some(
    term => term.field === field && term.value === value,
  ) ?? false
}

export const hasHealthSearchTerm = (query, value) => hasSearchTerm(query, SHOOT_HEALTH_FIELD, value)
export const hasProgressingSearchTerm = (query, value) => hasSearchTerm(query, SHOOT_PROGRESSING_FIELD, value)
export const hasOperatorActionSearchTerm = (query, value) => hasSearchTerm(query, SHOOT_OPERATOR_ACTION_FIELD, value)
export const hasAllTicketsIgnoredSearchTerm = (query, value) => hasSearchTerm(query, SHOOT_ALL_TICKETS_IGNORED_FIELD, value)

// Each shoot-list filter flag, when active, excludes rows with one specific
// value for its field. The search activates the filter exactly when that value
// survives no same-field term — mirroring SearchQuery.matches: a term admits
// the value iff matchShootField (negated when the term is excluded).
export function isHiddenBySearch (query, field, excludedCaseValue) {
  const terms = query?.terms?.filter(term => term.field === field) ?? []
  if (!terms.length) {
    return undefined
  }
  return !terms.every(term => {
    const matched = matchShootField(field, term, excludedCaseValue)
    return term.exclude ? !matched : matched
  })
}

// The second arg is the row-value the filter EXCLUDES when active (note the
// operatorAction filter excludes `false`, not `true`).
export const isHealthyHiddenBySearch = query => isHiddenBySearch(query, SHOOT_HEALTH_FIELD, SHOOT_HEALTH_HEALTHY)
export const isUnhealthyHiddenBySearch = query => isHiddenBySearch(query, SHOOT_HEALTH_FIELD, SHOOT_HEALTH_UNHEALTHY)
export const isProgressingHiddenBySearch = query => isHiddenBySearch(query, SHOOT_PROGRESSING_FIELD, true)
export const isOperatorActionHiddenBySearch = query => isHiddenBySearch(query, SHOOT_OPERATOR_ACTION_FIELD, false)
export const areAllTicketsIgnoredHiddenBySearch = query => isHiddenBySearch(query, SHOOT_ALL_TICKETS_IGNORED_FIELD, true)

export function resolveShootListFiltersFromSearch (shootSearchQuery) {
  return {
    healthy: isHealthyHiddenBySearch(shootSearchQuery) ?? false,
    unhealthy: isUnhealthyHiddenBySearch(shootSearchQuery) ?? false,
    progressing: isProgressingHiddenBySearch(shootSearchQuery) ?? false,
    operatorAction: isOperatorActionHiddenBySearch(shootSearchQuery) ?? false,
    allTicketsIgnored: areAllTicketsIgnoredHiddenBySearch(shootSearchQuery) ?? false,
  }
}

// The donut always links to the unhealthy subset. Its refinements are only
// effective while the parent "hide healthy" preference is enabled, though the
// persisted sub-filter values remain untouched.
export function resolveShootListFiltersForDonut (shootListFilters) {
  const refineUnhealthy = shootListFilters.healthy ?? false

  return {
    healthy: true,
    unhealthy: false,
    progressing: refineUnhealthy && (shootListFilters.progressing ?? false),
    operatorAction: refineUnhealthy && (shootListFilters.operatorAction ?? false),
    allTicketsIgnored: refineUnhealthy && (shootListFilters.allTicketsIgnored ?? false),
  }
}

// Per-field: which term.value maps to which concrete row value.
// A term matches a row iff the row's value is in the term value's match-set.
// `any` matches everything, `none` matches nothing.
const MATCH_SET_BY_FIELD = new Map([
  [SHOOT_HEALTH_FIELD, new Map([
    [SHOOT_HEALTH_HEALTHY, new Set([SHOOT_HEALTH_HEALTHY])],
    [SHOOT_HEALTH_UNHEALTHY, new Set([SHOOT_HEALTH_UNHEALTHY])],
  ])],
  [SHOOT_PROGRESSING_FIELD, new Map([
    [SHOOT_PROGRESSING_TRUE, new Set([true])],
    [SHOOT_PROGRESSING_FALSE, new Set([false])],
  ])],
  [SHOOT_OPERATOR_ACTION_FIELD, new Map([
    [SHOOT_OPERATOR_ACTION_TRUE, new Set([true])],
    [SHOOT_OPERATOR_ACTION_FALSE, new Set([false])],
  ])],
  [SHOOT_ALL_TICKETS_IGNORED_FIELD, new Map([
    [SHOOT_ALL_TICKETS_IGNORED_TRUE, new Set([true])],
    [SHOOT_ALL_TICKETS_IGNORED_FALSE, new Set([false])],
  ])],
])

const ANY_VALUE_BY_FIELD = new Map([
  [SHOOT_HEALTH_FIELD, SHOOT_HEALTH_ANY],
  [SHOOT_PROGRESSING_FIELD, SHOOT_PROGRESSING_ANY],
  [SHOOT_OPERATOR_ACTION_FIELD, SHOOT_OPERATOR_ACTION_ANY],
  [SHOOT_ALL_TICKETS_IGNORED_FIELD, SHOOT_ALL_TICKETS_IGNORED_ANY],
])

export function matchShootField (field, term, value) {
  if (term.value === ANY_VALUE_BY_FIELD.get(field)) {
    return true
  }
  const matchSet = MATCH_SET_BY_FIELD.get(field)?.get(term.value)
  return matchSet ? matchSet.has(value) : false
}

export const matchShootHealth = (term, value) => matchShootField(SHOOT_HEALTH_FIELD, term, value)
export const matchShootProgressing = (term, value) => matchShootField(SHOOT_PROGRESSING_FIELD, term, value)
export const matchShootOperatorAction = (term, value) => matchShootField(SHOOT_OPERATOR_ACTION_FIELD, term, value)
export const matchShootAllTicketsIgnored = (term, value) => matchShootField(SHOOT_ALL_TICKETS_IGNORED_FIELD, term, value)

export function buildSearchTerms (filters = {}) {
  // The remaining filters refine the unhealthy subset and are therefore only
  // effective while healthy shoots are hidden.
  if (!filters.healthy) {
    return ''
  }

  const terms = []
  terms.push(`${SHOOT_HEALTH_FIELD}:${SHOOT_HEALTH_UNHEALTHY}`)
  if (filters.progressing) {
    terms.push(`${SHOOT_PROGRESSING_FIELD}:${SHOOT_PROGRESSING_FALSE}`)
  }
  if (filters.operatorAction) {
    terms.push(`${SHOOT_OPERATOR_ACTION_FIELD}:${SHOOT_OPERATOR_ACTION_TRUE}`)
  }
  if (filters.allTicketsIgnored) {
    terms.push(`${SHOOT_ALL_TICKETS_IGNORED_FIELD}:${SHOOT_ALL_TICKETS_IGNORED_FALSE}`)
  }
  return terms.join(' ')
}

export function getShootHealth (object) {
  const status = get(object, ['metadata', 'labels', 'shoot.gardener.cloud/status'], SHOOT_HEALTH_HEALTHY)
  return status === SHOOT_HEALTH_HEALTHY
    ? SHOOT_HEALTH_HEALTHY
    : SHOOT_HEALTH_UNHEALTHY
}
