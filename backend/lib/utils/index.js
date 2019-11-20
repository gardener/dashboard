
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
const { getSeed } = require('../cache')
const yaml = require('js-yaml')
const { NotFound } = require('../errors')
const config = require('../config')
const assert = require('assert').strict
const fnv = require('fnv-plus')

function resolve (pathname) {
  return path.resolve(__dirname, '../..', pathname)
}

function cleanKubeconfig (input) {
  const cleanCluster = ({ name, cluster }) => {
    cluster = _.pick(cluster, ['server', 'insecure-skip-tls-verify', 'certificate-authority-data'])
    return { name, cluster }
  }
  const cleanContext = ({ name, context }) => {
    context = _.pick(context, ['cluster', 'user', 'namespace'])
    return { name, context }
  }
  const cleanAuthInfo = ({ name, user }) => {
    user = _.pick(user, ['client-certificate-data', 'client-key-data', 'token', 'username', 'password'])
    return { name, user }
  }
  const cleanConfig = ({
    clusters,
    contexts,
    'current-context': currentContext,
    users
  }) => {
    return {
      clusters: _.map(clusters, cleanCluster),
      contexts: _.map(contexts, cleanContext),
      'current-context': currentContext,
      users: _.map(users, cleanAuthInfo)
    }
  }
  if (_.isString(input)) {
    input = yaml.safeLoad(input)
  }
  return cleanConfig(input)
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

function shootHasIssue (shoot) {
  return _.get(shoot, ['metadata', 'labels', 'shoot.garden.sapcloud.io/status'], 'healthy') !== 'healthy'
}

async function getShootIngressDomain (projects, namespaces, shoot, seed = undefined) {
  if (!seed) {
    seed = getSeed(getSeedNameFromShoot(shoot))
  }
  const name = _.get(shoot, 'metadata.name')
  const namespace = _.get(shoot, 'metadata.namespace')

  const ingressDomain = _.get(seed, 'spec.dns.ingressDomain')
  const projectName = await getProjectNameFromNamespace(projects, namespaces, namespace)
  const hash = fnv.hash(`${name}.${projectName}`, 32).str()

  return `${hash}.${ingressDomain}`
}

async function getSeedIngressDomain (seed) {
  const ingressDomain = _.get(seed, 'spec.dns.ingressDomain')

  return `g.${ingressDomain}`
}

async function getSeedKubeconfig ({ coreClient, seed }) {
  const seedSecretName = _.get(seed, 'spec.secretRef.name')
  const seedSecretNamespace = _.get(seed, 'spec.secretRef.namespace')
  return getKubeconfig({ coreClient, name: seedSecretName, namespace: seedSecretNamespace })
}

async function getKubeconfig ({ coreClient, name, namespace }) {
  try {
    const secret = await coreClient.ns(namespace).secrets.get({ name })

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
    if (namespace === 'garden' && e.code === 404) {
      /*
        fallback: if there is no corresponding garden project, use namespace name.
        The community installer currently does not create a project resource for the garden namespace
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

function getConfigValue (path, defaultValue) {
  const value = _.get(config, path, defaultValue)
  if (arguments.length === 1 && typeof value === 'undefined') {
    assert.fail(`no config with ${path} found`)
  }
  return value
}

function getSeedNameFromShoot (shootResource) {
  if (shootResource.status && shootResource.status.seed) {
    return shootResource.status.seed
  }
  throw new Error(`There is no seed assigned to this shoot (yet)`)
}

module.exports = {
  cleanKubeconfig,
  resolve,
  decodeBase64,
  encodeBase64,
  shootHasIssue,
  getShootIngressDomain,
  getSeedIngressDomain,
  getKubeconfig,
  getSeedKubeconfig,
  getProjectNameFromNamespace,
  getProjectByNamespace,
  getConfigValue,
  getSeedNameFromShoot
}
