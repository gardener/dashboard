//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { getControllerRegistrations } = require('../cache')
const authorization = require('./authorization')
const _ = require('lodash')

exports.listExtensions = async function ({ user }) {
  const controllerregistrations = getControllerRegistrations()
  // required resoure kinds are essential for the frontend and need to be returned even if the user has not the right to read controllerregistrations
  const requiredResourceKinds = ['Network', 'DNSProvider']
  const stripNotRequiredInformation = ({ metadata, spec }) => {
    const resources = _.filter(spec.resources, resource => resource && _.includes(requiredResourceKinds, resource.kind))
    return {
      name: metadata.name,
      resources
    }
  }

  const allowed = await authorization.canListControllerRegistrations(user)
  if (!allowed) {
    return _
      .chain(controllerregistrations)
      .map(stripNotRequiredInformation)
      .filter(({ resources }) => !_.isEmpty(resources))
      .value()
  } else {
    return _.map(controllerregistrations, ({ metadata, spec }) => {
      return {
        name: metadata.name,
        version: _.get(spec, 'deployment.providerConfig.values.image.tag'),
        resources: _.get(spec, 'resources')
      }
    })
  }
}
