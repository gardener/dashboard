//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import config from '../config/index.js'
import configRoute from './config.mjs'
import infoRoute from './info.mjs'
import openapiRoute from '../openapi/index.mjs'
import userRoute from './user.mjs'
import cloudprofilesRoute from './cloudprofiles.mjs'
import seedsRoute from './seeds.mjs'
import gardenerExtensionsRoute from './gardenerExtensions.mjs'
import projectsRoute from './projects.mjs'
import shootsRoute from './shoots.mjs'
import ticketsRoute from './tickets.mjs'
import cloudProviderCredentialsRoute from './cloudProviderCredentials.mjs'
import membersRoute from './members.mjs'
import resourceQuotasRoute from './resourceQuotas.mjs'

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
  const terminalsRoute = (await import('./terminals.mjs')).default
  routes['/terminals'] = terminalsRoute
}

export default routes
