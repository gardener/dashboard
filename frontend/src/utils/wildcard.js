//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import startsWith from 'lodash/startsWith'
import endsWith from 'lodash/endsWith'
import map from 'lodash/map'
import trim from 'lodash/trim'
import filter from 'lodash/filter'
import head from 'lodash/head'

export function wildcardObjectsFromStrings (wildcardStrings) {
  return map(wildcardStrings, item => {
    let startsWithWildcard = false
    let endsWithWildcard = false
    let customWildcard = false
    const value = trim(item, '*')
    let pattern = value

    if (item === '*') {
      customWildcard = true
      pattern = '.*'
    } else if (startsWith(item, '*')) {
      startsWithWildcard = true
      pattern = '.*' + pattern
    } else if (endsWith(item, '*')) {
      endsWithWildcard = true
      pattern = pattern + '.*'
    }

    return {
      value,
      originalValue: item,
      startsWithWildcard,
      endsWithWildcard,
      customWildcard,
      isWildcard: startsWithWildcard || endsWithWildcard || customWildcard,
      regex: new RegExp('^' + pattern + '$')
    }
  })
}

export function bestMatchForString (wildCardObjects, wildCardString) {
  const matches = filter(wildCardObjects, (item) => {
    return item.regex.test(wildCardString)
  })
  matches.sort(function (a, b) {
    return b.value.length - a.value.length
  })
  matches.sort(function (a, b) {
    if (a.isWildcard && !b.isWildcard) {
      return 1
    }
    if (b.isWildcard && !a.isWildcard) {
      return -1
    }
    if (a.customWildcard && !b.customWildcard) {
      return 1
    }
    if (b.customWildcard && !a.customWildcard) {
      return -1
    }
    return 0
  })

  return head(matches)
}
