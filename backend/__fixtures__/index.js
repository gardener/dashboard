//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const config = require('./config')
const auth = require('./auth')
const kube = require('./kube')
const shoots = require('./shoots')
const seeds = require('./seeds')
const secrets = require('./secrets')
const secretbindings = require('./secretbindings')
const quotas = require('./quotas')
const projects = require('./projects')
const serviceaccounts = require('./serviceaccounts')
const cloudprofiles = require('./cloudprofiles')
const nodes = require('./nodes')
const terminals = require('./terminals')
const github = require('./github')
const reconnector = require('./reconnector')
const helper = require('./helper')
const user = {
  create (...args) {
    return auth.createUser(...args)
  }
}

const fixtures = {
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
  nodes,
  terminals,
  github,
  reconnector,
  helper
}
module.exports = fixtures
