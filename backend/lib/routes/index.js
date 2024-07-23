//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const config = require('../config')

module.exports = {
  '/config': require('./config'),
  '/info': require('./info'),
  '/openapi': require('../openapi'),
  '/user': require('./user'),
  '/cloudprofiles': require('./cloudprofiles'),
  '/seeds': require('./seeds'),
  '/gardenerextensions': require('./gardenerExtensions'),
  '/projects': require('./projects'),
  '/namespaces/:namespace/shoots': require('./shoots'),
  '/namespaces/:namespace/tickets': require('./tickets'),
  '/namespaces/:namespace/cloudprovidersecrets': require('./cloudProviderSecrets'),
  '/namespaces/:namespace/members': require('./members'),
  '/namespaces/:namespace/resourcequotas': require('./resourceQuotas')
}

if (_.get(config, 'frontend.features.terminalEnabled', false)) {
  module.exports['/terminals'] = require('./terminals')
}
