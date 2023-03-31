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
  if (item) {
    if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
      Vue.set(state.shoots, keyForShoot(item.metadata), assign(item, newItem))
    }
  } else {
    if (state.focusMode) {
      Vue.delete(state.staleShoots, newItem.metadata.uid)
    }
    newItem.info = undefined // register property to ensure reactivity
    Vue.set(state.shoots, keyForShoot(newItem.metadata), newItem)
  }
}
export function deleteItem (state, deletedItem) {
  const item = findItem(state)(deletedItem.metadata)

  if (item) {
    if (state.focusMode) {
      Vue.set(state.staleShoots, item.metadata.uid, item)
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

const wellKnownConditions = {
  APIServerAvailable: {
    name: 'API Server',
    shortName: 'API',
    description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.',
    sortOrder: '0'
  },
  ControlPlaneHealthy: {
    name: 'Control Plane',
    shortName: 'CP',
    description: 'Indicates whether all control plane components are up and running.',
    showAdminOnly: true,
    sortOrder: '1'
  },
  EveryNodeReady: {
    name: 'Nodes',
    shortName: 'N',
    description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.',
    sortOrder: '3'
  },
  SystemComponentsHealthy: {
    name: 'System Components',
    shortName: 'SC',
    description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '2'
  },
  ObservabilityComponentsHealthy: {
    name: 'Observability Components',
    shortName: 'OC',
    description: 'Indicates whether all observability components like Prometheus, Loki, Grafana, etc. are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '4'
  },
  MaintenancePreconditionsSatisfied: {
    name: 'Maintenance Preconditions Satisfied',
    shortName: 'M',
    description: 'Indicates whether Gardener is able to perform required actions during maintenance. If you do not resolve this issue your cluster will eventually turn into an error state.',
    sortOrder: '5'
  },
  HibernationPossible: {
    name: 'Hibernation Preconditions Satisfied',
    shortName: 'H',
    description: 'Indicates whether Gardener is able to hibernate this cluster. If you do not resolve this issue your hibernation schedule may not have any effect.',
    sortOrder: '6'
  }
}

export function getCondition (type) {
  if (type in wellKnownConditions) {
    return wellKnownConditions[type]
  }

  let name = ''
  let shortName = ''
  const words = type
    .replace(/(Available|Healthy|Ready|Availability)$/, '')
    // Cannot use lookbehind regex as not supported by all browsers (e.g. Safari)
    // therefore need to do it in two steps
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split before new words
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')// split after uppercase only words
    .split(' ')

  for (const word of words) {
    if (name) {
      name += ' '
    }
    name += word
    shortName += word[0]
  }
  return {
    name,
    shortName,
    sortOrder: shortName
  }
}
