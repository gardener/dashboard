//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import config from '../config/index.js'
import configRoute from './config.js'
import infoRoute from './info.js'
import openapiRoute from '../openapi/index.js'
import userRoute from './user.js'
import cloudprofilesRoute from './cloudprofiles.js'
import seedsRoute from './seeds.js'
import gardenerExtensionsRoute from './gardenerExtensions.js'
import projectsRoute from './projects.js'
import shootsRoute from './shoots.js'
import ticketsRoute from './tickets.js'
import cloudProviderCredentialsRoute from './cloudProviderCredentials.js'
import membersRoute from './members.js'
import resourceQuotasRoute from './resourceQuotas.js'
import terminalsRoute from './terminals.js'

const routes = {
  '/config': configRoute,
  '/info': infoRoute,
  '/openapi': openapiRoute,
  '/user': userRoute,
  '/cloudprofiles': cloudprofilesRoute,
  '/seeds': seedsRoute,
  '/gardenerextensions': gardenerExtensionsRoute,
  '/projects': projectsRoute,
  '/namespaces/:namespace/shoots': shootsRoute,
  '/namespaces/:namespace/tickets': ticketsRoute,
  '/cloudprovidercredentials': cloudProviderCredentialsRoute,
  '/namespaces/:namespace/members': membersRoute,
  '/namespaces/:namespace/resourcequotas': resourceQuotasRoute,
}

if (_.get(config, ['frontend', 'features', 'terminalEnabled'], false)) {
  routes['/terminals'] = terminalsRoute
}

export default routes
