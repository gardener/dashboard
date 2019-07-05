
//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const path = require('path')
const _ = require('lodash')
const { getSeeds } = require('../cache')
const kubernetes = require('../kubernetes')
const { NotFound } = require('../errors')
const config = require('../config')

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function resolve (pathname) {
  return path.resolve(__dirname, '../..', pathname)
}

function decodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'utf8').toString('base64')
}

const cloudProvider = {
  getKindList () {
    return ['aws', 'azure', 'gcp', 'openstack', 'alicloud']
  }
}

function getCloudProviderKind (object) {
  const cloudProviderKinds = cloudProvider.getKindList()
  return _.head(_.intersection(_.keys(object), cloudProviderKinds))
}

function shootHasIssue (shoot) {
  return _.get(shoot, ['metadata', 'labels', 'shoot.garden.sapcloud.io/status'], 'healthy') !== 'healthy'
}

async function getShootIngressDomain (projects, namespaces, shoot) {
  const seed = _.find(getSeeds(), ['metadata.name', shoot.spec.cloud.seed])

  return getShootIngressDomainForSeed(projects, namespaces, shoot, seed)
}

async function getShootIngressDomainForSeed (projects, namespaces, shoot, seed) {
  const name = _.get(shoot, 'metadata.name')
  const namespace = _.get(shoot, 'metadata.namespace')

  const ingressDomain = _.get(seed, 'spec.ingressDomain')
  const projectName = await getProjectNameFromNamespace(projects, namespaces, namespace)

  return `${name}.${projectName}.${ingressDomain}`
}

async function getSoilIngressDomainForSeed (projects, namespaces, seed) {
  const namespace = 'garden'

  const ingressDomain = _.get(seed, 'spec.ingressDomain')
  const projectName = await getProjectNameFromNamespace(projects, namespaces, namespace)

  return `${projectName}.${ingressDomain}`
}

async function getSeedKubeconfigForShoot ({ user, shoot }) {
  const seed = _.find(getSeeds(), ['metadata.name', shoot.spec.cloud.seed])
  const seedShootNS = _.get(shoot, 'status.technicalID')

  const coreClient = Core(user)
  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed })

  return { seed, seedKubeconfig, seedShootNS }
}

async function getSeedKubeconfig ({ coreClient, seed }) {
  const seedSecretName = _.get(seed, 'spec.secretRef.name')
  const seedSecretNamespace = _.get(seed, 'spec.secretRef.namespace')
  return getKubeconfig({ coreClient, secretName: seedSecretName, secretNamepsace: seedSecretNamespace })
}

async function getKubeconfig ({ coreClient, secretName, secretNamepsace }) {
  try {
    const secret = await coreClient.ns(secretNamepsace).secrets.get({ name: secretName })

    const kubeConfigBase64 = _.get(secret, 'data.kubeconfig')
    if (!kubeConfigBase64) {
      return
    }

    const kubeconfig = decodeBase64(secret.data.kubeconfig)
    return kubeconfig
  } catch (err) {
    if (err.code === 404) {
      return
    }
    throw err
  }
}

async function getProjectNameFromNamespace (projects, namespaces, namespace) {
  try {
    const project = await getProjectByNamespace(projects, namespaces, namespace)
    return project.metadata.name
  } catch (e) {
    if (e.code === 404) {
      /*
        fallback: there is no corresponding project, use namespace name
        the community installer currently does not create a project resource for the garden namespace
        because of https://github.com/gardener/gardener/issues/879
      */
      return namespace
    }
    throw e
  }
}

async function getProjectByNamespace (projects, namespaces, namespace) {
  const ns = await namespaces.get({ name: namespace })
  const name = _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
  if (!name) {
    throw new NotFound(`Namespace '${namespace}' is not related to a gardener project`)
  }
  return projects.get({ name })
}

function createOwnerRefArrayForResource (resource) {
  const name = _.get(resource, 'metadata.name')
  const uid = _.get(resource, 'metadata.uid')
  return [
    {
      apiVersion: resource.apiVersion,
      controller: true,
      kind: resource.kind,
      name,
      uid
    }
  ]
}

function getConfigValue ({ path, defaultValue = undefined, required = true }) {
  const value = _.get(config, path, defaultValue)
  if (required && !value) {
    throw new Error(`no config with ${path} found`)
  }
  return value
}

async function readServiceAccountToken ({ coreClient, namespace, serviceAccountName, waitUntilReady = true }) {
  let serviceAccount
  if (waitUntilReady) {
    const resourceName = serviceAccountName
    const conditionFunction = isServiceAccountReady
    const watch = coreClient.ns(namespace).serviceaccounts.watch({ name: serviceAccountName })
    serviceAccount = await kubernetes.waitUntilResourceHasCondition({ watch, conditionFunction, resourceName, waitTimeout: 10 * 1000 })
  } else {
    try {
      serviceAccount = await coreClient.ns(namespace).serviceaccounts.get({ name: serviceAccountName })
    } catch (err) {
      if (err.code !== 404) {
        throw err
      }
    }
  }
  const secrets = _.get(serviceAccount, 'secrets')
  const secretName = _.get(_.first(secrets), 'name')
  if (_.isEmpty(secretName)) {
    return
  }

  const secret = await coreClient.ns(namespace).secrets.get({ name: secretName })
  const token = decodeBase64(secret.data.token)
  const caData = secret.data['ca.crt']
  return { token, caData }
}

function isServiceAccountReady ({ secrets } = {}) {
  const secretName = _.get(_.first(secrets), 'name')
  return !_.isEmpty(secretName)
}

async function getTargetClusterClientConfig ({ coreClient, namespace, kubeconfigSecretName }) {
  const kubeconfig = await readSecretKubeconfig({ coreClient, namespace, secretName: kubeconfigSecretName })
  return kubernetes.fromKubeconfig(kubeconfig)
}

async function readSecretKubeconfig ({ coreClient, namespace, secretName }) {
  let secret
  try {
    secret = await coreClient.namespaces(namespace).secrets.get({ name: secretName })
  } catch (err) {
    if (err.code === 404) {
      return undefined
    } else {
      throw err
    }
  }
  const kubeconfig = decodeBase64(secret.data.kubeconfig)
  return kubeconfig
}

module.exports = {
  resolve,
  decodeBase64,
  encodeBase64,
  getCloudProviderKind,
  shootHasIssue,
  getShootIngressDomain,
  getShootIngressDomainForSeed,
  getSoilIngressDomainForSeed,
  getKubeconfig,
  getSeedKubeconfig,
  getSeedKubeconfigForShoot,
  getProjectNameFromNamespace,
  getProjectByNamespace,
  createOwnerRefArrayForResource,
  getConfigValue,
  readServiceAccountToken,
  getTargetClusterClientConfig,
  _cloudProvider: cloudProvider
}
