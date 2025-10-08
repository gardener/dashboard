//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import cacheModule from '../cache/index.js'
import * as authorization from './authorization.js'
import _ from 'lodash-es'

const REQUIRED_RESOURCE_KINDS = ['Network', 'DNSRecord']
const REQUIRED_RESOURCE_NAMES = ['extension-shoot-dns-service']

export async function listExtensions ({ user }) {
  const controllerregistrations = cacheModule.getControllerRegistrations()
  const allowed = await authorization.canListControllerRegistrations(user)
  const extensions = []
  for (const { metadata, spec = {} } of controllerregistrations) {
    const name = metadata.name
    if (allowed) {
      const version = _.get(metadata, ['labels', 'app.kubernetes.io/version'])
      const resources = spec.resources
      extensions.push({ name, version, resources })
    } else {
      // required resource kinds are essential for the frontend and need to be returned even if the user has not the permission to read controllerregistrations
      const resources = _.filter(spec.resources, ({ kind }) => REQUIRED_RESOURCE_KINDS.includes(kind))
      // only expose the extension if it contains one of the required resources
      if (!_.isEmpty(resources) || REQUIRED_RESOURCE_NAMES.includes(name)) {
        extensions.push({ name, resources })
      }
    }
  }
  return extensions
}
