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
import semver from 'semver'
import find from 'lodash/find'
import isArray from 'lodash/isArray'
import differenceWith from 'lodash/differenceWith'
import Vue from 'vue'

import {
  getCreatedBy,
  isShootStatusHibernated,
  isReconciliationDeactivated,
  getIssueSince
} from '@/utils'
import { findItem, parseSearch, constants, getCondition } from './helper'
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
      const labels = rootGetters['tickets/labels']({
        projectName: rootGetters.projectNameByNamespace(metadata),
        name: metadata.name
      })
      return join(map(labels, 'name'), ' ')
    }
    case 'errorCodes':
      return join(errorCodesFromArray(get(item, 'status.lastErrors', [])), ' ')
    case 'controlPlaneHighAvailability':
      return get(spec, 'controlPlane.highAvailability.failureTolerance.type')
    case 'issueSince':
      return getIssueSince(item.status) || 0
    case 'technicalId':
      return item.status?.technicalID
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
    case 'ticket': {
      const metadata = item.metadata
      return rootGetters['tickets/latestUpdated']({
        projectName: rootGetters.projectNameByNamespace(metadata),
        name: metadata.name
      })
    }
    default:
      return toLower(value)
  }
}

export default {
  filteredItems (state) {
    if (state.focusMode) {
      // When state is freezed, do not include new items
      return map(state.sortedUidsAtFreeze, freezedUID => {
        const activeItem = find(state.filteredShoots, ['metadata.uid', freezedUID])
        if (activeItem) {
          return activeItem
        }
        let staleItem = state.staleShoots[freezedUID]
        if (!staleItem) {
          // Object may have been filtered (e.g. now progressing) but is still in shoots. Also show as stale in this case
          staleItem = find(Object.values(state.shoots), ['metadata.uid', freezedUID])
          if (!staleItem) {
          // This should never happen ...
            Vue.logger.error('Could not find freezed shoot with uid %s in shoots or staleShoots', freezedUID)
          }
        }
        return { ...staleItem, stale: true }
      })
    }
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
  onlyShootsWithIssues (state) {
    return get(state.shootListFilters, 'onlyShootsWithIssues', true)
  },
  loading (state) {
    return state.subscriptionState > constants.DEFINED && state.subscriptionState < constants.OPEN
  },
  subscribed (state) {
    return state.subscriptionState === constants.OPEN
  },
  unsubscribed (state) {
    return state.subscriptionState === constants.CLOSED
  },
  subscription (state, getters, rootState) {
    const metadata = state.subscription
    if (!metadata) {
      return null
    }
    const { namespace = rootState.namespace, name } = metadata
    if (!namespace) {
      return null
    }
    if (name) {
      return { namespace, name }
    }
    if (namespace === '_all' && getters.onlyShootsWithIssues) {
      return { namespace, labelSelector: 'shoot.gardener.cloud/status!=healthy' }
    }
    return { namespace }
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
        getRawVal(rootGetters, item, 'controlPlaneHighAvailability'),
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
    return (items, sortByArr, sortDescArr) => {
      if (state.focusMode) {
        // no need to sort in focus mode sorting is freezed and filteredItems return items in last sorted order
        return items
      }
      const sortBy = isArray(sortByArr) ? head(sortByArr) : sortByArr
      const sortOrder = (isArray(sortDescArr) ? head(sortDescArr) : sortDescArr) ? 'desc' : 'asc'
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
          return items
        }
        case 'readiness': {
          const hideProgressingClusters = get(rootGetters.getShootListFilters, 'progressing', false)
          return orderBy(items, item => {
            const errorGroups = map(item.status?.conditions, itemCondition => {
              const isErrorCondition = (itemCondition?.status !== 'True' &&
                (!hideProgressingClusters || itemCondition?.status !== 'Progressing'))
              if (!isErrorCondition) {
                return {
                  sortOrder: `${Number.MAX_SAFE_INTEGER}`,
                  lastTransitionTime: itemCondition.lastTransitionTime
                }
              }
              const condition = getters.conditionForType(itemCondition.type)
              return {
                sortOrder: condition.sortOrder,
                lastTransitionTime: itemCondition.lastTransitionTime
              }
            })
            const { sortOrder, lastTransitionTime } = head(orderBy(errorGroups, ['sortOrder']))
            return [sortOrder, lastTransitionTime, 'metadata.name']
          },
          [sortOrder, sortOrder, 'asc'])
        }
        default: {
          return orderBy(items, [item => getSortVal(rootGetters, item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
        }
      }
    }
  },
  numberOfNewItemsSinceFreeze (state) {
    if (!state.focusMode) {
      return 0
    }
    return differenceWith(state.filteredShoots, state.sortedUidsAtFreeze, (filteredShoot, uid) => {
      return filteredShoot.metadata.uid === uid
    }).length
  },
  conditionForType (state, getters, rootState) {
    return (type) => {
      return get(rootState.cfg, ['knownConditions', type], getCondition(type))
    }
  }
}
