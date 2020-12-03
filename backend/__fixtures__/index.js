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
const quotas = require('./quotas')
const projects = require('./projects')
const cloudprofiles = require('./cloudprofiles')
const infrastructure = require('./infrastructure')
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
  projects,
  cloudprofiles,
  infrastructure,
  quotas,
  github,
  reconnector,
  helper
}
module.exports = fixtures
