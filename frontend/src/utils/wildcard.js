//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import startsWith from 'lodash/startsWith'
import endsWith from 'lodash/endsWith'
import map from 'lodash/map'
import filter from 'lodash/filter'
import head from 'lodash/head'

export function wildcardObjectsFromStrings (wildcardStrings) {
  return map(wildcardStrings, item => {
    let startsWithWildcard = false
    let endsWithWildcard = false
    let customWildcard = false
    let value = item

    if (item === '*') {
      customWildcard = true
      value = ''
    } else {
      if (startsWith(item, '*')) {
        startsWithWildcard = true
        value = value.substring(1, value.length)
      }
      if (endsWith(item, '*')) {
        endsWithWildcard = true
        value = value.substring(0, value.length - 1)
      }
    }

    return {
      value,
      originalValue: item,
      startsWithWildcard,
      endsWithWildcard,
      customWildcard,
      isWildcard: startsWithWildcard || endsWithWildcard || customWildcard,
      test (value) {
        if (!this.isWildcard) {
          return value === this.value
        }
        if (this.customWildcard) {
          return true
        }
        const index = value.indexOf(this.value)
        const lengthDifference = value.length - this.value.length

        if (this.startsWithWildcard && this.endsWithWildcard) {
          // included but does not start or end with
          return index > 0 && index < lengthDifference
        }
        if (this.startsWithWildcard) {
          // ends with and not equal
          return index === lengthDifference && lengthDifference > 0
        }
        if (this.endsWithWildcard) {
          // starts with and not equal
          return index === 0 && lengthDifference > 0
        }

        return false
      }
    }
  })
}

export function bestMatchForString (wildCardObjects, wildCardString) {
  const matches = filter(wildCardObjects, (item) => {
    return item.test(wildCardString)
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
