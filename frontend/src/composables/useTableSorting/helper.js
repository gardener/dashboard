//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isReconciliationDeactivated,
  isStatusHibernated,
} from '@/utils'
import {
  isUserError,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import head from 'lodash/head'
import padStart from 'lodash/padStart'

export function getReadinessSortVal ({
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

export function getLastOperationSortVal ({
  operation = {},
  lastErrors = [],
  metadata = {},
  status = {},
  isUserErrorFn = ({ lastErrors }) => isUserError(errorCodesFromArray(lastErrors)),
}) {
  const isError = operation.state === 'Failed' || lastErrors.length
  const ignoredFromReconciliation = isReconciliationDeactivated(metadata)

  if (ignoredFromReconciliation) {
    return isError
      ? 400
      : 450
  }

  const userError = isUserErrorFn({
    operation,
    lastErrors,
    metadata,
    status,
  })
  const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress

  if (userError) {
    return inProgress
      ? Number('3' + padStart(operation.progress, 2, '0'))
      : 200
  }
  if (isError) {
    return inProgress
      ? Number('1' + padStart(operation.progress, 2, '0'))
      : 0
  }
  return inProgress
    ? Number('6' + padStart(operation.progress, 2, '0'))
    : isStatusHibernated(status)
      ? 500
      : 700
}
