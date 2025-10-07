//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import { http } from '../symbols.js'
import * as groups from '../groups.js'
import APIRegistration from './APIRegistration.js'
import Authentication from './Authentication.js'
import Authorization from './Authorization.js'
import Coordination from './Coordination.js'
import Core from './Core.js'
import GardenerCore from './GardenerCore.js'
import GardenerDashboard from './GardenerDashboard.js'
import GardenerSeedManagement from './GardenerSeedManagement.js'
import Networking from './Networking.js'
import GardenerSecurity from './GardenerSecurity.js'
import KCPTenancy from './KCPTenancy.js'
import path from 'path'

const resourceGroups = _
  .chain(groups)
  .mapKeys(({ group }) => group || 'core')
  .mapValues(loadGroup)
  .value()

function loadGroup ({ name }) {
  const resourcesModules = {
    APIRegistration,
    Authentication,
    Authorization,
    Coordination,
    Core,
    GardenerCore,
    GardenerDashboard,
    GardenerSecurity,
    GardenerSeedManagement,
    Networking,
    KCPTenancy,
  }
  /* eslint-disable-next-line security/detect-object-injection -- function is only consumed internally with known input */
  const resources = resourcesModules[name]
  return _.mapKeys(resources, 'names.plural')
}

function load (clientConfig, workspace, options) {
  const createInstance = Ctor => new Ctor(clientConfig.extend({
    ...options,
    responseType: 'json',
    relativeUrl: workspace ? path.join('clusters', workspace, Ctor[http.relativeUrl]) : Ctor[http.relativeUrl],
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
