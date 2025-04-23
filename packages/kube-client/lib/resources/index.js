//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import { http } from '../symbols.js'

const resourceGroups = await (async () => {
  const groupsModule = await import('../groups.js')
  const groups = Object.values(groupsModule)

  const rg = {}
  for (const { group, name } of groups) {
    const groupKey = group || 'core'
    const resources = await loadGroup(name)
    rg[groupKey] = _.mapKeys(resources, 'names.plural')
  }
  return rg
})()

async function loadGroup (name) {
  const resourcesModule = await import(`./${name}.js`)
  return resourcesModule.default || resourcesModule
}

function load (clientConfig, options) {
  const createInstance = Ctor => new Ctor(clientConfig.extend({
    ...options,
    responseType: 'json',
    relativeUrl: Ctor[http.relativeUrl],
  }))
  const createInstances = resourceGroup => _.mapValues(resourceGroup, createInstance)
  return _.mapValues(resourceGroups, createInstances)
}

function getResourceMetadata (Resource) {
  const { group, version, names: { plural, kind } } = Resource
  return {
    name: plural,
    kind,
    apiVersion: group === '' ? version : `${group}/${version}`,
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

export const Resources = _.reduce(resourceGroups, getResourceGroupMetadata, {
  TokenRequest: {
    name: 'token',
    kind: 'TokenRequest',
    apiVersion: 'authentication.k8s.io/v1',
  },
  AdminKubeconfigRequest: {
    name: 'adminkubeconfig',
    kind: 'AdminKubeconfigRequest',
    apiVersion: 'authentication.gardener.cloud/v1alpha1',
    subresource: true,
  },
})

export function assign (object, ...args) {
  return Object.assign(object, load(...args))
}
