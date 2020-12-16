//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find, set } = require('lodash')

const nodeList = [
  getNode({ name: 'node-1', hostname: 'host-1' }),
  getNode({ name: 'node-2', hostname: 'host-2', ready: false })
]

function getNode (options = {}) {
  const {
    name,
    creationTimestamp = '2020-01-01T00:00:00Z',
    hostname,
    ready = true
  } = options
  const metadata = {
    name,
    creationTimestamp
  }
  if (hostname) {
    set(metadata, 'labels["kubernetes.io/hostname"]', hostname)
  }
  const status = {
    conditions: [{
      type: 'Ready',
      status: ready ? 'True' : 'False'
    }]
  }
  return { metadata, status }
}

const nodes = {
  create (options) {
    return getNode(options)
  },
  get (name) {
    const items = nodes.list()
    return find(items, ['metadata.name', name])
  },
  list () {
    return cloneDeep(nodeList)
  }
}

const mocks = {
  list () {
    // eslint-disable-next-line no-unused-vars
    const path = '/api/v1/nodes'
    return () => {
      const items = nodes.list()
      return Promise.resolve({ items })
    }
  }
}

module.exports = {
  ...nodes,
  mocks
}
