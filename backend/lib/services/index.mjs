//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import cloudprofiles from './cloudprofiles.js'
import seeds from './seeds.js'
import projects from './projects.js'
import shoots from './shoots.js'
import cloudProviderCredentials from './cloudProviderCredentials.js'
import membersModule from './members/index.js'
import authorization from './authorization.js'
import authentication from './authentication.js'
import tickets from './tickets.js'
import terminalsModule from './terminals/index.js'
import controllerregistrations from './controllerregistrations.js'
import resourceQuotas from './resourceQuotas.js'
const members = membersModule
const terminals = terminalsModule

export default {
  cloudprofiles,
  seeds,
  projects,
  shoots,
  cloudProviderCredentials,
  members,
  authorization,
  authentication,
  tickets,
  terminals,
  controllerregistrations,
  resourceQuotas,
}
