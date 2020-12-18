//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

module.exports = {
  cloudprofiles: require('./cloudprofiles'),
  seeds: require('./seeds'),
  projects: require('./projects'),
  shoots: require('./shoots'),
  infrastructureSecrets: require('./infrastructureSecrets'),
  members: require('./members'),
  authorization: require('./authorization'),
  authentication: require('./authentication'),
  tickets: require('./tickets'),
  terminals: require('./terminals'),
  controllerregistrations: require('./controllerregistrations')
}
