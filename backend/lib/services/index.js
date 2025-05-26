//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import * as cloudprofiles from './cloudprofiles.js'
import * as seeds from './seeds.js'
import * as projects from './projects.js'
import * as shoots from './shoots.js'
import * as cloudProviderCredentials from './cloudProviderCredentials.js'
import * as membersModule from './members/index.js'
import * as authentication from './authentication.js'
import * as authorization from './authorization.js'
import * as tickets from './tickets.js'
import * as terminalsModule from './terminals/index.js'
import * as controllerregistrations from './controllerregistrations.js'
import * as resourceQuotas from './resourceQuotas.js'
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
