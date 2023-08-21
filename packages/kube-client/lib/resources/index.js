//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { http } = require('../symbols')

const resourceGroups = _
  .chain(require('../groups'))
  .mapKeys(({ group }) => group || 'core')
  .mapValues(loadGroup)
  .value()

function loadGroup ({ name }) {
  const resources = require(`./${name}`)
  return _.mapKeys(resources, 'names.plural')
}

function load (clientConfig, options) {
  const createInstance = Ctor => new Ctor(clientConfig.extend({
    ...options,
    responseType: 'json',
    relativeUrl: Ctor[http.relativeUrl]
  }))
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

exports.Resources = _.reduce(resourceGroups, getResourceGroupMetadata, {
  TokenRequest: {
    name: 'token',
    kind: 'TokenRequest',
    apiVersion: 'authentication.k8s.io/v1'
  },
  AdminKubeconfigRequest: {
    name: 'adminkubeconfig',
    kind: 'AdminKubeconfigRequest',
    apiVersion: 'authentication.gardener.cloud/v1alpha1',
    subresource: true
  }
})

exports.assign = (object, ...args) => {
  return Object.assign(object, load(...args))
}
