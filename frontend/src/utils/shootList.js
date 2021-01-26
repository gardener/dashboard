//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import get from 'lodash/get'
import filter from 'lodash/filter'
import split from 'lodash/split'
import some from 'lodash/some'
import includes from 'lodash/includes'
import startsWith from 'lodash/startsWith'
import head from 'lodash/head'
import orderBy from 'lodash/orderBy'
import toLower from 'lodash/toLower'
import join from 'lodash/join'
import map from 'lodash/map'
import padStart from 'lodash/padStart'

import {
  getCreatedBy,
  getProjectName,
  isShootStatusHibernated,
  isReconciliationDeactivated
} from '@/utils'

import { isUserError, errorCodesFromArray } from '@/utils/errorCodes'

import semver from 'semver'

export function searchShoots (ticketsLabels, shootCustomFields, shootCustomFieldList, value, search, item) {
  const searchableCustomFields = filter(shootCustomFieldList, ['searchable', true])

  const searchValue = split(search, ' ')
  return some(searchValue, value => {
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'name'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'infrastructure'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'seed'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'project'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'createdBy'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'purpose'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'k8sVersion'), value)) {
      return true
    }
    if (includes(getRawVal(ticketsLabels, shootCustomFields, item, 'ticketLabels'), value)) {
      return true
    }

    return some(searchableCustomFields, ({ key }) => includes(getRawVal(ticketsLabels, shootCustomFields, item, key), value))
  })
}

export function sortShoots (ticketsLabels, shootCustomFields, latestUpdatedTicketByNameAndNamespace, items, sortByArr, sortDescArr) {
  const sortBy = head(sortByArr)
  const sortOrder = head(sortDescArr) ? 'desc' : 'asc'
  if (sortBy) {
    const sortbyNameAsc = (a, b) => {
      if (getRawVal(ticketsLabels, shootCustomFields, a, 'name') > getRawVal(ticketsLabels, shootCustomFields, b, 'name')) {
        return 1
      } else if (getRawVal(ticketsLabels, shootCustomFields, a, 'name') < getRawVal(ticketsLabels, shootCustomFields, b, 'name')) {
        return -1
      }
      return 0
    }
    const inverse = sortOrder === 'desc' ? -1 : 1
    switch (sortBy) {
      case 'k8sVersion': {
        items.sort((a, b) => {
          const versionA = getRawVal(ticketsLabels, shootCustomFields, a, sortBy)
          const versionB = getRawVal(ticketsLabels, shootCustomFields, b, sortBy)

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
          const readinessA = getSortVal(ticketsLabels, shootCustomFields, latestUpdatedTicketByNameAndNamespace, a, sortBy)
          const readinessB = getSortVal(ticketsLabels, shootCustomFields, latestUpdatedTicketByNameAndNamespace, b, sortBy)

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
        items = orderBy(items, [item => getSortVal(ticketsLabels, shootCustomFields, latestUpdatedTicketByNameAndNamespace, item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
      }
    }
  }
  return items
}

function getRawVal (ticketsLabels, shootCustomFields, item, column) {
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
      return getProjectName(metadata)
    case 'k8sVersion':
      return get(spec, 'kubernetes.version')
    case 'infrastructure':
      return `${get(spec, 'provider.type')} ${get(spec, 'region')}`
    case 'seed':
      return get(item, 'spec.seedName')
    case 'ticketLabels': {
      const labels = ticketsLabels(metadata)
      return join(map(labels, 'name'), ' ')
    }
    default: {
      if (startsWith(column, 'Z_')) {
        const path = get(shootCustomFields, [column, 'path'])
        return get(item, path)
      }
      return metadata[column]
    }
  }
}

function getSortVal (ticketsLabels, shootCustomFields, latestUpdatedTicketByNameAndNamespace, item, sortBy) {
  const value = getRawVal(ticketsLabels, shootCustomFields, item, sortBy)
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
      return latestUpdatedTicketByNameAndNamespace({ namespace, name })
    }
    default:
      return toLower(value)
  }
}
