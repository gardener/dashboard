//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import map from 'lodash/map'
import floor from 'lodash/floor'
import replace from 'lodash/replace'
import upperFirst from 'lodash/upperFirst'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import split from 'lodash/split'

export function getProjectQuotaStatus (quota) {
  if (!quota) {
    return undefined
  }

  const { hard, used } = quota
  const quotaStatus = map(hard, (limitValue, key) => {
    const usedValue = used[key] || 0
    const percentage = floor((usedValue / limitValue) * 100)
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
      hard[key] = Math.min(value, currentValue).toString()
    }
    for (const [key, value] of Object.entries(quota.used)) {
      const currentValue = used[key] ?? Number.MIN_SAFE_INTEGER
      used[key] = Math.max(value, currentValue).toString()
    }
  }

  return {
    hard,
    used,
  }
}
