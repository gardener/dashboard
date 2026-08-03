//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  formatValue,
  isCustomField,
} from '@/composables/useProjectShootCustomFields/helper'
import {
  formatProjectNameAndTitle,
  getProjectTitle,
} from '@/composables/useProjectMetadata/helper.js'
import {
  getLastOperationSortVal,
  getReadinessSortVal,
} from '@/composables/useTableSorting/helper'
import { parseSearch } from '@/composables/useTableFilter/helper'

import {
  isTruthyValue,
  isStatusProgressing,
  getCreatedBy,
  getIssueSince,
} from '@/utils'
import {
  isUserError,
  isTemporaryError,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import {
  SHOOT_HEALTH_FIELD,
  SHOOT_PROGRESSING_FIELD,
  SHOOT_OPERATOR_ACTION_FIELD,
  SHOOT_ALL_TICKETS_IGNORED_FIELD,
  getShootHealth,
  matchShootHealth,
  matchShootProgressing,
  matchShootOperatorAction,
  matchShootAllTicketsIgnored,
  normalizeShootSearch,
} from './search'

import head from 'lodash/head'
import get from 'lodash/get'
import map from 'lodash/map'
import filter from 'lodash/filter'
import some from 'lodash/some'
import includes from 'lodash/includes'
import toLower from 'lodash/toLower'
import join from 'lodash/join'
import padStart from 'lodash/padStart'
import orderBy from 'lodash/orderBy'

export const constants = Object.freeze({
  DEFINED: 0,
  LOADING: 1,
  LOADED: 2,
  OPENING: 3,
  OPEN: 4,
  CLOSING: 5,
  CLOSED: 6,
})

export function isHealthyFilterActive (state, context) {
  const {
    authzStore,
    healthy,
  } = context
  return authzStore.namespace === '_all' && (healthy.value ?? true)
}

function requiresOperatorAction (item) {
  const ignoreIssues = isTruthyValue(get(item, ['metadata', 'annotations', 'dashboard.gardener.cloud/ignore-issues']))
  if (ignoreIssues) {
    return false
  }
  const lastErrors = get(item, ['status', 'lastErrors'], [])
  const allLastErrorCodes = errorCodesFromArray(lastErrors)
  if (isTemporaryError(allLastErrorCodes)) {
    return false
  }
  const conditions = get(item, ['status', 'conditions'], [])
  const allConditionCodes = errorCodesFromArray(conditions)

  const constraints = get(item, ['status', 'constraints'], [])
  const allConstraintCodes = errorCodesFromArray(constraints)

  return !(isUserError(allLastErrorCodes) || isUserError(allConditionCodes) || isUserError(allConstraintCodes))
}

function getTicketsForCluster (context, item) {
  const {
    projectStore,
    ticketStore,
  } = context

  const metadata = get(item, ['metadata'], {})
  return ticketStore.issues({
    ...metadata,
    projectName: projectStore.projectNameByNamespace(metadata),
  })
}

function ticketHasHideLabel (ticket, hideClustersWithLabels) {
  const labelNames = map(get(ticket, ['data', 'labels']), 'name')
  return some(hideClustersWithLabels, hideClustersWithLabel => includes(labelNames, hideClustersWithLabel))
}

function areAllTicketsIgnored (context, item) {
  const { configStore } = context

  const hideClustersWithLabels = get(configStore.ticket, ['hideClustersWithLabels'])
  if (!hideClustersWithLabels) {
    return false
  }
  const ticketsForCluster = getTicketsForCluster(context, item)
  if (!ticketsForCluster.length) {
    return false
  }

  return !some(ticketsForCluster, ticket => !ticketHasHideLabel(ticket, hideClustersWithLabels))
}

export function getFilteredUids (state, context) {
  // filter function
  const notProgressing = item => {
    return !isStatusProgressing(get(item, ['metadata'], {}))
  }

  const hasTicketsWithoutHideLabel = item => {
    const {
      projectStore,
      ticketStore,
      configStore,
    } = context
    const hideClustersWithLabels = get(configStore.ticket, ['hideClustersWithLabels'])
    if (!hideClustersWithLabels) {
      return true
    }
    const metadata = get(item, ['metadata'], {})
    metadata.projectName = projectStore.projectNameByNamespace(metadata)
    const ticketsForCluster = ticketStore.issues(metadata)
    if (!ticketsForCluster.length) {
      return true
    }

    const ticketsWithoutHideLabel = filter(ticketsForCluster, ticket => {
      const labelNames = map(get(ticket, ['data', 'labels']), 'name')
      const ticketHasHideLabel = some(hideClustersWithLabels, hideClustersWithLabel => includes(labelNames, hideClustersWithLabel))
      return !ticketHasHideLabel
    })
    return ticketsWithoutHideLabel.length > 0
  }

  // list of active filter function
  const predicates = []
  if (isHealthyFilterActive(state, context)) {
    const {
      progressing,
      noOperatorAction,
      ignoredTickets,
    } = context

    if (progressing.value) {
      predicates.push(notProgressing)
    }
    if (noOperatorAction.value) {
      predicates.push(requiresOperatorAction)
    }
    if (ignoredTickets.value) {
      predicates.push(hasTicketsWithoutHideLabel)
    }
  }

  return Object.values(state.shoots)
    .filter(item => {
      for (const predicate of predicates) {
        if (!predicate(item)) {
          return false
        }
      }
      return true
    })
    .map(item => item.metadata.uid)
}

export function getRawVal (context, item, column) {
  const {
    projectStore,
    ticketStore,
    shootCustomFieldsComposable,
  } = context

  const metadata = item.metadata
  const spec = item.spec
  switch (column) {
    case 'purpose':
      return get(spec, ['purpose'])
    case 'lastOperation':
      return get(item, ['status', 'lastOperation'])
    case 'createdAt':
      return metadata.creationTimestamp
    case 'createdBy':
      return getCreatedBy(metadata)
    case 'project': {
      const project = projectStore.projectByNamespace(metadata)
      const title = getProjectTitle(project)
      return formatProjectNameAndTitle(project.metadata.name, title)
    }
    case 'k8sVersion':
      return get(spec, ['kubernetes', 'version'])
    case 'infrastructure':
      return `${get(spec, ['provider', 'type'])} ${get(spec, ['region'])}`
    case 'provider':
      return get(spec, ['provider', 'type'])
    case 'region':
      return get(spec, ['region'])
    case 'seed':
      return get(item, ['spec', 'seedName'])
    case SHOOT_HEALTH_FIELD:
      return getShootHealth(item)
    case SHOOT_PROGRESSING_FIELD:
      return isStatusProgressing(metadata)
    case SHOOT_OPERATOR_ACTION_FIELD:
      return requiresOperatorAction(item)
    case SHOOT_ALL_TICKETS_IGNORED_FIELD:
      return areAllTicketsIgnored(context, item)
    case 'ticketLabels': {
      const labels = ticketStore.labels({
        projectName: projectStore.projectNameByNamespace(metadata),
        name: metadata.name,
      })
      return join(map(labels, 'name'), ' ')
    }
    case 'errorCodes':
      return join(errorCodesFromArray(get(item, ['status', 'lastErrors'], [])), ' ')
    case 'controlPlaneHighAvailability':
      return get(spec, ['controlPlane', 'highAvailability', 'failureTolerance', 'type'])
    case 'issueSince':
      return getIssueSince(item.status)
    case 'technicalId':
      return item.status?.technicalID
    case 'workers':
      return item.spec.provider.workers?.length ?? 0
    default: {
      if (isCustomField(column)) {
        const {
          getCustomFieldByKey,
        } = shootCustomFieldsComposable
        const path = getCustomFieldByKey(column)?.path
        const value = get(item, path)
        return formatValue(value, ' ')
      }
      return get(metadata, [column])
    }
  }
}

export function getSortVal (state, context, item, sortBy) {
  const {
    configStore,
    projectStore,
    ticketStore,
    seedStore,
  } = context

  const purposeValue = {
    infrastructure: 0,
    production: 1,
    development: 2,
    evaluation: 3,
  }

  const value = getRawVal(context, item, sortBy)
  const status = item.status
  switch (sortBy) {
    case 'purpose':
      return get(purposeValue, [value], 4)
    case 'k8sVersion':
      return (value || '0.0.0').split('.').map(i => padStart(i, 4, '0')).join('.')
    case 'lastOperation': {
      return getLastOperationSortVal({
        operation: value,
        lastErrors: item.status?.lastErrors,
        metadata: item.metadata,
        status,
      })
    }
    case 'readiness': {
      const conditions = item.status?.conditions ?? []
      const constraints = item.status?.constraints ?? []
      const readinessConditions = [...conditions, ...constraints]
      const hideProgressingClusters = context.progressing.value ?? false
      const lastOperationTime = item.status?.lastOperation?.lastUpdateTime
      const creationTime = item.metadata.creationTimestamp
      const isErrorFn = status => status !== 'True' && !(hideProgressingClusters && status === 'Progressing')
      return getReadinessSortVal({
        conditions: readinessConditions,
        lastOperationTime,
        creationTime,
        isErrorFn,
        configStore,
      })
    }
    case 'seedReadiness': {
      const seedName = get(item, ['spec', 'seedName'])
      if (!seedName) {
        return '99999999' // lowest priority when not assigned to seed yet
      }
      const seed = seedStore.seedByName(seedName)
      if (!seed) {
        return '99999999' // lowest priority when seed not found
      }
      const conditions = get(seed, ['status', 'conditions'], [])
      const lastOperationTime = get(seed, ['status', 'lastOperation', 'lastUpdateTime'])
      const creationTime = get(seed, ['metadata', 'creationTimestamp'])
      const isErrorFn = status => status !== 'True'
      return getReadinessSortVal({
        conditions,
        lastOperationTime,
        creationTime,
        isErrorFn,
        configStore,
      })
    }
    case 'ticket': {
      const metadata = item.metadata
      return ticketStore.latestUpdated({
        projectName: projectStore.projectNameByNamespace(metadata),
        name: metadata.name,
      })
    }
    default:
      if (typeof value === 'number') {
        return value
      }
      return toLower(value)
  }
}

// Built-in fields addressable with `field:value` in the search.
const QUALIFIED_SEARCH_FIELDS = Object.freeze([
  'name',
  'project',
  'seed',
  'purpose',
  'provider',
  'region',
  'k8sVersion',
  'createdBy',
  SHOOT_HEALTH_FIELD,
  SHOOT_PROGRESSING_FIELD,
  SHOOT_OPERATOR_ACTION_FIELD,
  SHOOT_ALL_TICKETS_IGNORED_FIELD,
])

export function parseShootSearch (search) {
  return normalizeShootSearch(parseSearch(search, QUALIFIED_SEARCH_FIELDS))
}

export function searchItemsFn (state, context) {
  const {
    shootCustomFieldsComposable,
  } = context

  const {
    shootCustomFields,
  } = shootCustomFieldsComposable

  const searchableCustomFields = computed(() => {
    return filter(shootCustomFields.value, ['searchable', true])
  })

  return search => {
    const searchQuery = parseShootSearch(search)

    return item => {
      const f = key => ({ get: () => getRawVal(context, item, key) })
      const fields = {
        name: f('name'),
        [SHOOT_HEALTH_FIELD]: {
          get: () => getRawVal(context, item, SHOOT_HEALTH_FIELD),
          match: matchShootHealth,
          freeText: false,
        },
        [SHOOT_PROGRESSING_FIELD]: {
          get: () => getRawVal(context, item, SHOOT_PROGRESSING_FIELD),
          match: matchShootProgressing,
          freeText: false,
        },
        [SHOOT_OPERATOR_ACTION_FIELD]: {
          get: () => getRawVal(context, item, SHOOT_OPERATOR_ACTION_FIELD),
          match: matchShootOperatorAction,
          freeText: false,
        },
        [SHOOT_ALL_TICKETS_IGNORED_FIELD]: {
          get: () => getRawVal(context, item, SHOOT_ALL_TICKETS_IGNORED_FIELD),
          match: matchShootAllTicketsIgnored,
          freeText: false,
        },
        provider: f('provider'),
        region: f('region'),
        seed: f('seed'),
        project: f('project'),
        createdBy: f('createdBy'),
        purpose: f('purpose'),
        k8sVersion: f('k8sVersion'),
        ticketLabels: f('ticketLabels'),
        errorCodes: f('errorCodes'),
        controlPlaneHighAvailability: f('controlPlaneHighAvailability'),
      }
      Object.assign(fields, Object.fromEntries(
        searchableCustomFields.value.map(({ key }) => [key, f(key)]),
      ))

      return searchQuery.matches(fields)
    }
  }
}

export function sortItemsFn (state, context) {
  return (items, sortByItems) => {
    if (state.focusMode) {
      // no need to sort in focus mode sorting is freezed and filteredItems return items in last sorted order
      return items
    }
    const { key, order = 'asc' } = head(sortByItems) ?? {}
    if (!key) {
      return items
    }

    const iteratee = item => getSortVal(state, context, item, key)

    let sortKeys
    let sortOrders
    if (key === 'seedReadiness') {
      // second sort key is the seed name
      sortKeys = [iteratee, ['spec', 'seedName'], ['metadata', 'name']]
      sortOrders = [order, 'asc', 'asc']
    } else {
      sortKeys = [iteratee, ['metadata', 'name']]
      sortOrders = [order, 'asc']
    }

    return orderBy(items, sortKeys, sortOrders)
  }
}

export function shootHasIssue (object) {
  return get(object, ['metadata', 'labels', 'shoot.gardener.cloud/status'], 'healthy') !== 'healthy'
}
