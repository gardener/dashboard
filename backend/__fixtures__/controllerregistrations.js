//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

function getControllerRegistration ({ uid, name, version, resources }) {
  const metadata = {
    name,
    uid
  }
  const spec = {}
  if (resources) {
    spec.resources = resources
  }
  if (version) {
    spec.deployment = {
      providerConfig: {
        values: {
          image: {
            tag: version
          }
        }
      }
    }
  }
  return { metadata, spec }
}

const controllerRegistrationList = [
  getControllerRegistration({
    uid: 1,
    name: 'foo',
    version: 'v1.0.0',
    resources: [{
      kind: 'OperatingSystemConfig',
      type: 'gardenlinux'
    }]
  }),
  getControllerRegistration({
    uid: 2,
    name: 'bar',
    resources: [{
      kind: 'Network',
      type: 'gardium'
    }]
  })
]

const controllerregistrations = {
  create (options) {
    return getControllerRegistration(options)
  },
  get (name) {
    const items = controllerregistrations.list()
    return find(items, ['metadata.name', name])
  },
  list () {
    return cloneDeep(controllerRegistrationList)
  }
}

module.exports = {
  ...controllerregistrations
}
