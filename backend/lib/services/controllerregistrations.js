//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { getControllerRegistrations } = require('../cache')
const authorization = require('./authorization')
const _ = require('lodash')

const REQUIRED_RESOURCE_KINDS = ['Network', 'DNSProvider']
exports.listExtensions = async function ({ user }) {
  const controllerregistrations = getControllerRegistrations()
  const allowed = await authorization.canListControllerRegistrations(user)
  const extensions = []
  for (const { metadata, spec = {} } of controllerregistrations) {
    const name = metadata.name
    if (allowed) {
      const version = _.get(metadata, ['labels', 'app.kubernetes.io/version'])
      const resources = spec.resources
      extensions.push({ name, version, resources })
    } else {
      // required resoure kinds are essential for the frontend and need to be returned even if the user has not the permission to read controllerregistrations
      const resources = _.filter(spec.resources, ({ kind }) => REQUIRED_RESOURCE_KINDS.includes(kind))
      // only expose the extension if it contains one of the required resources
      if (!_.isEmpty(resources)) {
        extensions.push({ name, resources })
      }
    }
  }
  return extensions
}
