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

const kubernetesClient = require('../kubernetes-client')
const kubeconfig = require('../kubeconfig')
const utils = require('../utils')
const { getSeed } = require('../cache')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')
const yaml = require('js-yaml')

const { isHttpError, createClient } = kubernetesClient
const { decodeBase64 } = utils

async function getSeedKubeconfigForShoot ({ user, shoot }) {
  const client = user.api
  if (!shoot.status || !shoot.status.seed) {
    return {}
  }
  const seed = getSeed(client.getSeedNameFromShoot(shoot))
  const seedShootNamespace = shoot.status.technicalID

  const seedKubeconfig = await client.getSeedKubeconfig(seed)
  return { seed, seedKubeconfig, seedShootNamespace }
}

function getSecret (client, { namespace, name }) {
  try {
    return client.core.secrets.get({ namespace, name })
  } catch (err) {
    if (isHttpError(err, 404)) {
      return
    }
    logger.error('failed to fetch %s secret: %s', name, err) // pragma: whitelist secret
    throw err
  }
}

async function assignComponentSecret (client, data, component, namespace, name) {
  const secret = await getSecret(client, { namespace, name })
  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('username', 'password')
      .forEach((value, key) => {
        if (key === 'password') {
          data[`${component}_password`] = decodeBase64(value)
        } else if (key === 'username') {
          data[`${component}_username`] = decodeBase64(value)
        }
      })
      .commit()
  }
}

exports.list = async function ({ user, namespace, shootsWithIssuesOnly = false }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client
  const options = {}
  if (shootsWithIssuesOnly) {
    options.query = { labelSelector: 'shoot.garden.sapcloud.io/status!=healthy' }
  }
  if (namespace) {
    options.namespace = namespace
  } else {
    options.allNamespaces = true
  }
  return gardener.shoots.get(options)
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client

  const username = user.id
  const finalizers = ['gardener']
  const annotations = {
    'garden.sapcloud.io/createdBy': username
  }
  body = _.merge({}, body, { metadata: { namespace, finalizers, annotations } })
  return gardener.shoots.create({ namespace, json: body })
}

async function read ({ user, namespace, name }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client

  return gardener.shoots.get({ namespace, name })
}
exports.read = read

exports.exists = async function ({ user, namespace, name }) {
  try {
    await read({ user, namespace, name })
    return true
  } catch (err) {
    if (isHttpError(404)) {
      return false
    }
    throw err
  }
}

async function patch ({ user, type = 'merge', namespace, name, body }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client

  return gardener.shoots.patch({ type, namespace, name, json: body })
}
exports.patch = patch

exports.replace = async function ({ user, namespace, name, body }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client

  const { metadata, kind, apiVersion, status } = await gardener.shoots.get({ namespace, name })
  const {
    metadata: { labels, annotations },
    spec
  } = body
  // assign new labels and annotations to metadata
  Object.assign(metadata, { labels, annotations })
  // compose new body
  body = { kind, apiVersion, metadata, spec, status }
  // replace
  return gardener.shoots.update({ namespace, name, json: body })
}

exports.replaceVersion = async function ({ user, namespace, name, body }) {
  const version = body.version
  const patchOperations = [
    {
      op: 'replace',
      path: '/spec/kubernetes/version',
      value: version
    }
  ]
  return patch({ user, type: 'json', namespace, name, body: patchOperations })
}

exports.replaceHibernationEnabled = async function ({ user, namespace, name, body }) {
  const enabled = !!body.enabled
  const payload = {
    spec: {
      hibernation: {
        enabled
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

exports.replaceHibernationSchedules = async function ({ user, namespace, name, body }) {
  const schedules = body
  const payload = {
    spec: {
      hibernation: {
        schedules
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

exports.replaceAddons = async function ({ user, namespace, name, body }) {
  const addons = body
  const payload = {
    spec: {
      addons
    }
  }
  return patch({ user, namespace, name, body: payload })
}

exports.replaceWorkers = async function ({ user, namespace, name, body }) {
  const workers = body
  const patchOperations = [
    {
      op: 'replace',
      path: `/spec/provider/workers`,
      value: workers
    }
  ]
  return patch({ user, type: 'json', namespace, name, body: patchOperations })
}

exports.replaceMaintenance = async function ({ user, namespace, name, body }) {
  const { timeWindowBegin, timeWindowEnd, updateKubernetesVersion, updateOSVersion } = body
  const payload = {
    spec: {
      maintenance: {
        timeWindow: {
          begin: timeWindowBegin,
          end: timeWindowEnd
        },
        autoUpdate: {
          kubernetesVersion: updateKubernetesVersion,
          machineImageVersion: updateOSVersion
        }
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

const patchAnnotations = async function ({ user, namespace, name, annotations }) {
  const body = {
    metadata: {
      annotations: annotations
    }
  }
  return patch({ user, namespace, name, body })
}
exports.patchAnnotations = patchAnnotations

exports.remove = async function ({ user, namespace, name }) {
  const client = user.api
  const { 'core.gardener.cloud': gardener } = client

  const annotations = {
    'confirmation.garden.sapcloud.io/deletion': 'true'
  }
  await patchAnnotations({ user, namespace, name, annotations })

  return gardener.shoots.delete({ namespace, name })
}

async function readSecret ({ user, namespace, name }) {
  const client = user.api
  try {
    return await client.core.secrets.get({ namespace, name })
  } catch (err) {
    if (isHttpError(err, 404)) {
      return
    }
    throw err
  }
}

exports.info = async function ({ user, namespace, name }) {
  const client = user.api

  const [
    shoot,
    secret
  ] = await Promise.all([
    read({ user, namespace, name }),
    readSecret({ user, namespace, name: `${name}.kubeconfig` })
  ])

  const project = await client.getProjectByNamespace(namespace)
  const projectName = project.metadata.name

  const data = {}
  if (shoot.status && shoot.status.seed) {
    const seed = getSeed(client.getSeedNameFromShoot(shoot))
    const ingressDomain = _.get(seed, 'spec.dns.ingressDomain')
    if (ingressDomain) {
      data.seedShootIngressDomain = `${name}.${projectName}.${ingressDomain}`
    }
  }

  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('kubeconfig', 'username', 'password', 'token')
      .forEach((value, key) => {
        value = decodeBase64(value)
        if (key === 'kubeconfig') {
          try {
            data[key] = yaml.safeDump(kubeconfig.cleanKubeconfig(value))
          } catch (err) {
            logger.error('failed to clean kubeconfig', err)
          }
        } else {
          data[`cluster_${key}`] = value
        }
      })
      .commit()

    data.serverUrl = kubeconfig.fromKubeconfig(data.kubeconfig).url
  }

  const isAdmin = await authorization.isAdmin(user)
  if (isAdmin) {
    const { seedKubeconfig, seedShootNamespace } = await getSeedKubeconfigForShoot({ user, shoot })

    if (seedKubeconfig && seedShootNamespace) {
      try {
        const options = kubeconfig.fromKubeconfig(seedKubeconfig)
        const seedClient = createClient(options)

        await assignComponentSecrets(seedClient, data, seedShootNamespace)
      } catch (error) {
        logger.error('Failed to retrieve information using seed core client', error)
      }
    }
  } else {
    await assignComponentSecrets(client, data, namespace, name)
  }

  return data
}

function assignComponentSecrets (client, data, namespace, name) {
  const components = ['monitoring', 'logging']
  return Promise.all(components.map(component => {
    const ingressSecretName = name ? `${name}.${component}` : `${component}-ingress-credentials`
    return assignComponentSecret(client, data, component, namespace, ingressSecretName)
  }))
}
