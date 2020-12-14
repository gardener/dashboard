//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Forbidden } = require('http-errors')
const { getControllerRegistrations } = require('../cache')
const authorization = require('./authorization')
const _ = require('lodash')

function fromResource (controllerregistrations) {
  return _.map(controllerregistrations, ({ metadata, spec }) => {
    return {
      name: metadata.name,
      version: _.get(spec, 'deployment.providerConfig.values.image.tag'),
      resources: spec.resources
    }
  })
}

exports.list = async function ({ user }) {
  const allowed = await authorization.canListControllerRegistrations(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list controllerregistrations')
  }

  const controllerregistrations = getControllerRegistrations()
  return fromResource(controllerregistrations)
}

exports.listNetworkingTpes = async function () {
  const controllerregistrations = getControllerRegistrations()
  return _
    .chain(controllerregistrations)
    .flatMap('spec.resources')
    .filter(['kind', 'Network'])
    .map('type')
    .value()
}
