//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers } = require('@gardener-dashboard/test-utils')
const config = require('./config')
const auth = require('./auth')
const kube = require('./kube')
const shoots = require('./shoots')
const seeds = require('./seeds')
const secrets = require('./secrets')
const secretbindings = require('./secretbindings')
const quotas = require('./quotas')
const controllerregistrations = require('./controllerregistrations')
const projects = require('./projects')
const serviceaccounts = require('./serviceaccounts')
const cloudprofiles = require('./cloudprofiles')
const nodes = require('./nodes')
const terminals = require('./terminals')
const github = require('./github')
const helper = require('./helper')
const user = {
  create (...args) {
    return auth.createUser(...args)
  }
}

function resetAll () {
  projects.reset()
}

const fixtures = {
  matchers,
  config,
  auth,
  user,
  kube,
  shoots,
  seeds,
  secrets,
  secretbindings,
  projects,
  serviceaccounts,
  cloudprofiles,
  quotas,
  controllerregistrations,
  nodes,
  terminals,
  github,
  helper,
  resetAll
}
module.exports = fixtures
