//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const config = require('../config')

module.exports = {
  '/info': require('./info'),
  '/openapi': require('../openapi'),
  '/user': require('./user'),
  '/cloudprofiles': require('./cloudprofiles'),
  '/seeds': require('./seeds'),
  '/shoots': require('./shoots'),
  '/gardener-extensions': require('./gardenerExtensions'),
  '/networking-types': require('./networkingTypes'),
  '/namespaces': require('./namespaces'),
  '/namespaces/:namespace/shoots': require('./shoots'),
  '/namespaces/:namespace/infrastructure-secrets': require('./infrastructureSecrets'),
  '/namespaces/:namespace/members': require('./members')
}

if (_.get(config, 'frontend.features.terminalEnabled', false)) {
  module.exports['/terminals'] = require('./terminals')
}
