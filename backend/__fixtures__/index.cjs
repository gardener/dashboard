//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers } = require('@gardener-dashboard/test-utils')
const config = require('./config')
const leases = require('./leases')
const auth = require('./auth')
const kube = require('./kube')
const shoots = require('./shoots')
const seeds = require('./seeds')
const managedseeds = require('./managedseeds')
const configmaps = require('./configmaps')
const secrets = require('./secrets')
const secretbindings = require('./secretbindings')
const credentialsbindings = require('./credentialsBindings')
const workloadidentities = require('./workloadIdentities')
const quotas = require('./quotas')
const controllerregistrations = require('./controllerregistrations')
const resourcequotas = require('./resourcequotas')
const projects = require('./projects')
const serviceaccounts = require('./serviceaccounts')
const cloudprofiles = require('./cloudprofiles')
const namespacedCloudProfiles = require('./namespacedCloudProfiles')
const nodes = require('./nodes')
const terminals = require('./terminals')
const github = require('./github')
const helper = require('./helper')
const env = require('./env')
const user = {
  create (...args) {
    return auth.createUser(...args)
  },
}

function resetAll () {
  projects.reset()
}

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
  namespacedCloudProfiles,
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
module.exports = fixtures
