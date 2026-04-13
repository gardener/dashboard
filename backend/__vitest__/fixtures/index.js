//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import testUtils from '@gardener-dashboard/test-utils'
import config from './config.js'
import leases from './leases.js'
import * as auth from './auth.js'
import kube from './kube.js'
import shoots from './shoots.js'
import seeds from './seeds.js'
import managedseeds from './managedseeds.js'
import configmaps from './configmaps.js'
import secrets from './secrets.js'
import secretbindings from './secretbindings.js'
import credentialsbindings from './credentialsBindings.js'
import workloadidentities from './workloadIdentities.js'
import quotas from './quotas.js'
import controllerregistrations from './controllerregistrations.js'
import resourcequotas from './resourcequotas.js'
import projects from './projects.js'
import serviceaccounts from './serviceaccounts.js'
import cloudprofiles from './cloudprofiles.js'
import nodes from './nodes.js'
import terminals from './terminals.js'
import github from './github.js'
import * as helper from './helper.js'
import * as env from './env.js'

const user = {
  create (...args) {
    return auth.createUser(...args)
  },
}

function resetAll () {
  projects.reset()
}

const { matchers } = testUtils

const fixtures = {
  matchers,
  config,
  leases,
  auth,
  user,
  kube,
  shoots,
  seeds,
  managedseeds,
  configmaps,
  secrets,
  secretbindings,
  credentialsbindings,
  workloadidentities,
  projects,
  serviceaccounts,
  cloudprofiles,
  quotas,
  controllerregistrations,
  resourcequotas,
  nodes,
  terminals,
  github,
  helper,
  env,
  resetAll,
}

export default fixtures
