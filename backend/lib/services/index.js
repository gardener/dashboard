//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

module.exports = {
  cloudprofiles: require('./cloudprofiles'),
  seeds: require('./seeds'),
  projects: require('./projects'),
  shoots: require('./shoots'),
  cloudProviderSecrets: require('./cloudProviderSecrets'),
  members: require('./members'),
  authorization: require('./authorization'),
  authentication: require('./authentication'),
  tickets: require('./tickets'),
  terminals: require('./terminals'),
  controllerregistrations: require('./controllerregistrations'),
  resourceQuotas: require('./resourceQuotas')
}
