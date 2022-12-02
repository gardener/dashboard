//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import find from 'lodash/find'
import includes from 'lodash/includes'
import assign from 'lodash/assign'

export function keyForShoot ({ name, namespace }) {
  return `${name}_${namespace}`
}

export function findItem (state) {
  return ({ name, namespace }) => state.shoots[keyForShoot({ name, namespace })]
}

export function putItem (state, newItem) {
  const item = findItem(state)(newItem.metadata)
  if (item !== undefined) {
    if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
      Vue.set(state.shoots, keyForShoot(item.metadata), assign(item, newItem))
    }
  } else {
    if (state.freezeSorting) {
      Vue.delete(state.freezedStaleShoots, newItem.metadata.uid)
    }
    newItem.info = undefined // register property to ensure reactivity
    Vue.set(state.shoots, keyForShoot(newItem.metadata), newItem)
  }
}
export function deleteItem (state, deletedItem) {
  const item = findItem(state)(deletedItem.metadata)

  if (item !== undefined) {
    if (state.freezeSorting && state.uidsAtFreeze.includes(item.metadata.uid)) {
      Vue.set(state.freezedStaleShoots, item.metadata.uid, { ...item, stale: true })
    }
    Vue.delete(state.shoots, keyForShoot(item.metadata))
  }
}

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
    if (value[0] === '"' && value[end] === '"') {
      exact = true
      value = value.substring(1, end).replace(/""/g, '"')
    }
    if (value) {
      terms.push({
        value,
        exact,
        exclude
      })
    }
  }
  return new SearchQuery(terms)
}

export const constants = Object.freeze({
  DEFINED: 0,
  LOADING: 1,
  OPENING: 2,
  OPEN: 3,
  CLOSING: 4,
  CLOSED: 5
})
