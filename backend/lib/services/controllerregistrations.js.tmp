//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { getControllerRegistrations } = require('../cache')
const _ = require('lodash')
const { get } = require('lodash')

function fromResource (controllerregistrations) {
  return _.map(controllerregistrations, ({ metadata, spec }) => {
    return {
      name: metadata.name,
      version: get(spec, 'deployment.providerConfig.values.image.tag'),
      resources: spec.resources
    }
  })
}

exports.list = function () {
  const controllerregistrations = getControllerRegistrations()
  return fromResource(controllerregistrations)
}
