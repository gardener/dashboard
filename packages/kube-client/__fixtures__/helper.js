//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helper } = require('@gardener-dashboard/test-utils')
const { parseKubeconfig } = require('@gardener-dashboard/kube-config')

function createTestKubeconfig (user = { token: 'token' }, cluster = { server: 'server' }) {
  return parseKubeconfig({
    'current-context': 'default',
    contexts: [{
      name: 'default',
      context: {
        user: 'user',
        cluster: 'cluster',
      },
    }],
    users: [{
      name: 'user',
      user,
    }],
    clusters: [{
      name: 'cluster',
      cluster,
    }],
  })
}

module.exports = {
  ...helper,
  createTestKubeconfig,
}
