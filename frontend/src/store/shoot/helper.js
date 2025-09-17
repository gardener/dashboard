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
  isTruthyValue,
  isStatusProgressing,
  isReconciliationDeactivated,
  getCreatedBy,
  isStatusHibernated,
  getIssueSince,
} from '@/utils'
import {
  isUserError,
  isTemporaryError,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import find from 'lodash/find'
import includes from 'lodash/includes'
import head from 'lodash/head'
import get from 'lodash/get'
import map from 'lodash/map'
import filter from 'lodash/filter'
import some from 'lodash/some'
import toLower from 'lodash/toLower'
import join from 'lodash/join'
import padStart from 'lodash/padStart'
import orderBy from 'lodash/orderBy'

const tokenizePattern = /(-?"([^"]|"")*"|\S+)/g

export function tokenizeSearch (text) {
  const tokens = typeof text === 'string'
    ? text.match(tokenizePattern)
    : null
  return tokens || []
}

export class SearchQuery {
  constructor (terms) {
    this.terms = terms
  }

  matches (values) {
    for (const term of this.terms) {
      const found = !!find(values, value => term.exact ? value === term.value : includes(value, term.value))
      if ((!found && !term.exclude) || (found && term.exclude)) {
        return false
      }
    }
    return true
  }
}

export function parseSearch (text) {
  const terms = []
  for (let value of tokenizeSearch(text)) {
    let exclude = false
    if (value[0] === '-') {
      exclude = true
      value = value.substring(1)
    }
    let exact = false
    const end = value.length - 1
    if (value[0] === '"' && value[end] === '"') { // eslint-disable-line security/detect-object-injection
      exact = true
      value = value.substring(1, end).replace(/""/g, '"')
    }
    if (value) {
      terms.push({
        value,
        exact,
        exclude,
      })
    }
  }
  return new SearchQuery(terms)
}

export const constants = Object.freeze({
  DEFINED: 0,
  LOADING: 1,
  LOADED: 2,
  OPENING: 3,
  OPEN: 4,
  CLOSING: 5,
  CLOSED: 6,
})

export function onlyAllShootsWithIssues (state, context) {
  const {
    authzStore,
  } = context
  return authzStore.namespace === '_all' && get(state.shootListFilters, ['onlyShootsWithIssues'], true)
}

export function getFilteredUids (state, context) {
  const {
    projectStore,
    ticketStore,
    configStore,
  } = context

  // filter function
  const notProgressing = item => {
    return !isStatusProgressing(get(item, ['metadata'], {}))
  }

  const noUserError = item => {
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

  const reconciliationNotDeactivated = item => {
    return !isReconciliationDeactivated(get(item, ['metadata'], {}))
  }

  const hasTicketsWithoutHideLabel = item => {
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
  if (onlyAllShootsWithIssues(state, context)) {
    if (get(state, ['shootListFilters', 'progressing'], false)) {
      predicates.push(notProgressing)
    }
    if (get(state, ['shootListFilters', 'noOperatorAction'], false)) {
      predicates.push(noUserError)
    }
    if (get(state, ['shootListFilters', 'deactivatedReconciliation'], false)) {
      predicates.push(reconciliationNotDeactivated)
    }
    if (get(state, ['shootListFilters', 'hideTicketsWithLabel'], false)) {
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
    case 'seed':
      return get(item, ['spec', 'seedName'])
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

function getReadinessSortVal ({
  conditions,
  lastOperationTime,
  creationTime,
  isErrorFn,
  configStore,
}) {
  if (!conditions.length) {
    // items without conditions have medium priority
    const priority = '00000100'
    const time = lastOperationTime ?? creationTime
    return `${priority}-${time}`
  }
  const iteratee = ({ type, status = 'True', lastTransitionTime = '1970-01-01T00:00:00Z' }) => {
    const isError = isErrorFn(status)
    // items without any error have lowest priority
    const priority = !isError
      ? '99999999'
      : padStart(configStore.conditionForType(type).sortOrder, 8, '0')
    return `${priority}-${lastTransitionTime}`
  }
  // the condition with the lowest priority and transitionTime is used
  return head(conditions.map(iteratee).sort())
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
      const operation = value || {}
      const lastErrors = item.status?.lastErrors ?? []
      const isError = operation.state === 'Failed' || lastErrors.length
      const ignoredFromReconciliation = isReconciliationDeactivated(item.metadata ?? {})

      if (ignoredFromReconciliation) {
        return isError
          ? 400
          : 450
      }

      const userError = isUserError(errorCodesFromArray(lastErrors))
      const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress

      if (userError) {
        return inProgress
          ? '3' + padStart(operation.progress, 2, '0')
          : 200
      }
      if (isError) {
        return inProgress
          ? '1' + padStart(operation.progress, 2, '0')
          : 0
      }
      return inProgress
        ? '6' + padStart(operation.progress, 2, '0')
        : isStatusHibernated(status)
          ? 500
          : 700
    }
    case 'readiness': {
      const conditions = item.status?.conditions ?? []
      const constraints = item.status?.constraints ?? []
      const readinessConditions = [...conditions, ...constraints]
      const hideProgressingClusters = get(state.shootListFilters, ['progressing'], false)
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

  let searchQuery
  let searchQueryTerms = []
  let lastSearch

  return (search, item) => {
    if (search !== lastSearch) {
      lastSearch = search
      searchQuery = parseSearch(search)
      searchQueryTerms = map(searchQuery.terms, 'value')
    }

    if (searchQueryTerms.includes('workerless')) {
      if (getRawVal(context, item, 'workers') === 0) {
        return true
      }
    }

    const values = [
      getRawVal(context, item, 'name'),
      getRawVal(context, item, 'infrastructure'),
      getRawVal(context, item, 'seed'),
      getRawVal(context, item, 'project'),
      getRawVal(context, item, 'createdBy'),
      getRawVal(context, item, 'purpose'),
      getRawVal(context, item, 'k8sVersion'),
      getRawVal(context, item, 'ticketLabels'),
      getRawVal(context, item, 'errorCodes'),
      getRawVal(context, item, 'controlPlaneHighAvailability'),
      ...map(searchableCustomFields.value, ({ key }) => getRawVal(context, item, key)),
    ]

    return searchQuery.matches(values)
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
