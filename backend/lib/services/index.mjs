//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import * as cloudprofiles from './cloudprofiles.mjs'
import * as seeds from './seeds.mjs'
import * as projects from './projects.mjs'
import shoots from './shoots.js'
import * as cloudProviderCredentials from './cloudProviderCredentials.mjs'
import * as membersModule from './members/index.mjs'
import * as authentication from './authentication.mjs'
import authorization from './authorization.js'
import * as tickets from './tickets.mjs'
import * as terminalsModule from './terminals/index.mjs'
import * as controllerregistrations from './controllerregistrations.mjs'
import * as resourceQuotas from './resourceQuotas.mjs'
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
