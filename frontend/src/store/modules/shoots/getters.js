//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import filter from 'lodash/filter'
import startsWith from 'lodash/startsWith'
import head from 'lodash/head'
import orderBy from 'lodash/orderBy'
import toLower from 'lodash/toLower'
import join from 'lodash/join'
import map from 'lodash/map'
import padStart from 'lodash/padStart'
import differenceBy from 'lodash/differenceBy'
import semver from 'semver'
import clone from 'lodash/clone'
import find from 'lodash/find'

import {
  getCreatedBy,
  isShootStatusHibernated,
  isReconciliationDeactivated,
  getIssueSince
} from '@/utils'
import { findItem, parseSearch } from './helper'
import { isUserError, errorCodesFromArray } from '@/utils/errorCodes'

export function getRawVal (rootGetters, item, column) {
  const metadata = item.metadata
  const spec = item.spec
  switch (column) {
    case 'purpose':
      return get(spec, 'purpose')
    case 'lastOperation':
      return get(item, 'status.lastOperation')
    case 'createdAt':
      return metadata.creationTimestamp
    case 'createdBy':
      return getCreatedBy(metadata)
    case 'project':
      return rootGetters.projectNameByNamespace(metadata)
    case 'k8sVersion':
      return get(spec, 'kubernetes.version')
    case 'infrastructure':
      return `${get(spec, 'provider.type')} ${get(spec, 'region')}`
    case 'seed':
      return get(item, 'spec.seedName')
    case 'ticketLabels': {
      const labels = rootGetters.ticketsLabels(metadata)
      return join(map(labels, 'name'), ' ')
    }
    case 'errorCodes':
      return join(errorCodesFromArray(get(item, 'status.lastErrors', [])), ' ')
    case 'issueSince':
      return getIssueSince(item.status) || 0
    default: {
      if (startsWith(column, 'Z_')) {
        const path = get(rootGetters.shootCustomFields, [column, 'path'])
        return get(item, path)
      }
      return metadata[column]
    }
  }
}

export function getSortVal (rootGetters, item, sortBy) {
  const value = getRawVal(rootGetters, item, sortBy)
  const status = item.status
  switch (sortBy) {
    case 'purpose':
      switch (value) {
        case 'infrastructure':
          return 0
        case 'production':
          return 1
        case 'development':
          return 2
        case 'evaluation':
          return 3
        default:
          return 4
      }
    case 'lastOperation': {
      const operation = value || {}
      const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress
      const lastErrors = get(item, 'status.lastErrors', [])
      const isError = operation.state === 'Failed' || lastErrors.length
      const allErrorCodes = errorCodesFromArray(lastErrors)
      const userError = isUserError(allErrorCodes)
      const ignoredFromReconciliation = isReconciliationDeactivated(get(item, 'metadata', {}))

      if (ignoredFromReconciliation) {
        if (isError) {
          return 400
        } else {
          return 450
        }
      } else if (userError && !inProgress) {
        return 200
      } else if (userError && inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `3${progress}`
      } else if (isError && !inProgress) {
        return 0
      } else if (isError && inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `1${progress}`
      } else if (inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `6${progress}`
      } else if (isShootStatusHibernated(status)) {
        return 500
      }
      return 700
    }
    case 'readiness': {
      const errorConditions = filter(get(status, 'conditions'), condition => get(condition, 'status') !== 'True')
      const lastErrorTransitionTime = head(orderBy(map(errorConditions, 'lastTransitionTime')))
      return lastErrorTransitionTime
    }
    case 'ticket': {
      const { namespace, name } = item.metadata
      return rootGetters.latestUpdatedTicketByNameAndNamespace({ namespace, name })
    }
    default:
      return toLower(value)
  }
}

export default {
  filteredItems (state) {
    return state.filteredShoots
  },
  itemByNameAndNamespace (state) {
    return findItem(state)
  },
  selectedItem (state, getters) {
    if (state.selection) {
      return getters.itemByNameAndNamespace(state.selection)
    }
  },
  getShootListFilters (state) {
    return state.shootListFilters
  },
  getFreezeSorting (state) {
    return state.freezeSorting
  },
  onlyShootsWithIssues (state, getters) {
    return get(getters.getShootListFilters, 'onlyShootsWithIssues', true)
  },
  newShootResource (state) {
    return state.newShootResource
  },
  initialNewShootResource (state) {
    return state.initialNewShootResource
  },
  searchItems (state, getters, rootState, rootGetters) {
    let searchQuery
    let lastSearchString

    return (value, search, item) => {
      const searchableCustomFields = filter(rootGetters.shootCustomFieldList, ['searchable', true])
      const values = [
        getRawVal(rootGetters, item, 'name'),
        getRawVal(rootGetters, item, 'infrastructure'),
        getRawVal(rootGetters, item, 'seed'),
        getRawVal(rootGetters, item, 'project'),
        getRawVal(rootGetters, item, 'createdBy'),
        getRawVal(rootGetters, item, 'purpose'),
        getRawVal(rootGetters, item, 'k8sVersion'),
        getRawVal(rootGetters, item, 'ticketLabels'),
        getRawVal(rootGetters, item, 'errorCodes'),
        ...map(searchableCustomFields, ({ key }) => getRawVal(rootGetters, item, key))
      ]

      if (search !== lastSearchString) {
        lastSearchString = search
        searchQuery = parseSearch(search)
      }
      return searchQuery.matches(values)
    }
  },
  sortItems (state, getters, rootState, rootGetters) {
    let sortedItems
    let _sortByArr
    let _sortDescArr
    return (items, sortByArr, sortDescArr) => {
      // If the list is freezed, do not alter the order of the items, except if the user explicitly changes the sorting
      if (state.freezeSorting && _sortByArr === sortByArr && _sortDescArr === sortDescArr) {
        // New Items are items added to the list after the freeze
        let newItems = differenceBy(items, sortedItems, 'metadata.uid')
        newItems = map(newItems, newItem => {
          return {
            ...newItem,
            addedAfterFreeze: true // Flag them so that the UI can render them accordingly
          }
        })

        const existingItems = map(sortedItems, sortedItem => {
          const item = find(items, item => {
            return item.metadata.uid === sortedItem.metadata.uid
          })
          if (item) {
            return item
          }
          // Keep Items that no longer in the list as stale items, to keep the list static
          return {
            ...sortedItem,
            stale: true // Flag them so that the UI can render them accordingly
          }
        })

        // Add new items to the end of the list to keep the list static
        return [
          ...existingItems,
          ...newItems
        ]
      }

      // Regular sorting logic
      const sortBy = head(sortByArr)
      const sortOrder = head(sortDescArr) ? 'desc' : 'asc'
      if (!sortBy) {
        return items
      }
      const sortbyNameAsc = (a, b) => {
        if (getRawVal(rootGetters, a, 'name') > getRawVal(rootGetters, b, 'name')) {
          return 1
        } else if (getRawVal(rootGetters, a, 'name') < getRawVal(rootGetters, b, 'name')) {
          return -1
        }
        return 0
      }
      const inverse = sortOrder === 'desc' ? -1 : 1
      switch (sortBy) {
        case 'k8sVersion': {
          items.sort((a, b) => {
            const versionA = getRawVal(rootGetters, a, sortBy)
            const versionB = getRawVal(rootGetters, b, sortBy)

            if (semver.gt(versionA, versionB)) {
              return 1 * inverse
            } else if (semver.lt(versionA, versionB)) {
              return -1 * inverse
            } else {
              return sortbyNameAsc(a, b)
            }
          })
          break
        }
        case 'readiness': {
          items.sort((a, b) => {
            const readinessA = getSortVal(rootGetters, a, sortBy)
            const readinessB = getSortVal(rootGetters, b, sortBy)

            if (readinessA === readinessB) {
              return sortbyNameAsc(a, b)
            } else if (!readinessA) {
              return 1
            } else if (!readinessB) {
              return -1
            } else if (readinessA > readinessB) {
              return 1 * inverse
            } else {
              return -1 * inverse
            }
          })
          break
        }
        default: {
          items = orderBy(items, [item => getSortVal(rootGetters, item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
        }
      }
      sortedItems = clone(items)
      _sortByArr = sortByArr
      _sortDescArr = sortDescArr

      return items
    }
  }
}
