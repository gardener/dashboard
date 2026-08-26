//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import testUtils from '@gardener-dashboard/test-utils'
import kubeConfig from '@gardener-dashboard/kube-config'

const { helper } = testUtils
const { parseKubeconfig } = kubeConfig

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

export default {
  ...helper,
  createTestKubeconfig,
}
