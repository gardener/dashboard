//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

const resourceGroups = _
  .chain(require('../groups'))
  .mapKeys(({ group }) => group || 'core')
  .mapValues(loadGroup)
  .value()

function loadGroup ({ name }) {
  const resources = require(`./${name}`)
  return _.mapKeys(resources, 'names.plural')
}

function load (options) {
  const createInstance = Ctor => new Ctor({ ...options, responseType: 'json' })
  const createInstances = resourceGroup => _.mapValues(resourceGroup, createInstance)
  return _.mapValues(resourceGroups, createInstances)
}

function getResourceMetadata (Resource) {
  const { group, version, names: { plural, kind } } = Resource
  return {
    name: plural,
    kind,
    apiVersion: group === '' ? version : `${group}/${version}`
  }
}

function getResourceGroupMetadata (resources, resourceGroup) {
  return _
    .chain(resourceGroup)
    .mapKeys('names.kind')
    .mapValues(getResourceMetadata)
    .assign(resources)
    .value()
}

exports.Resources = _.reduce(resourceGroups, getResourceGroupMetadata, {})

exports.assign = (object, options) => {
  return Object.assign(object, load(options))
}
