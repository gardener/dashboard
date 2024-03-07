//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { parseNumberWithMagnitudeSuffix } from '@/utils'

import {
  map,
  replace,
  upperFirst,
  sortBy,
  head,
  split,
} from '@/lodash'

export function getProjectQuotaStatus (quota) {
  if (!quota) {
    return undefined
  }

  const { hard, used } = quota
  const quotaStatus = map(hard, (limitValue, key) => {
    const usedValue = used[key] || 0
    const percentage = Math.floor((usedValue / limitValue) * 100)
    const resourceName = replace(key, 'count/', '')
    const caption = upperFirst(head(split(resourceName, '.')))
    let progressColor = 'primary'

    if (percentage >= 100) {
      progressColor = 'error'
    } else if (percentage >= 80) {
      progressColor = 'warning'
    }

    return {
      key,
      resourceName,
      caption,
      limitValue,
      usedValue,
      percentage,
      progressColor,
    }
  })

  return sortBy(quotaStatus, 'caption')
}

export function aggregateResourceQuotaStatus (quotas) {
  const hard = {}
  const used = {}

  for (const quota of quotas) {
    for (const [key, value] of Object.entries(quota.hard)) {
      const currentValue = hard[key] ?? Number.MAX_SAFE_INTEGER
      hard[key] = Math.min(parseNumberWithMagnitudeSuffix(value), currentValue).toString()
    }
    for (const [key, value] of Object.entries(quota.used)) {
      const currentValue = used[key] ?? Number.MIN_SAFE_INTEGER
      used[key] = Math.max(parseNumberWithMagnitudeSuffix(value), currentValue).toString()
    }
  }

  return {
    hard,
    used,
  }
}
