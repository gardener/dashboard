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

const { HTTPError } = require('got')
const { isHttpError } = require('../kubernetes-client')
const kubeconfig = require('../kubernetes-config')
const utils = require('../utils')
const { getSeed } = require('../cache')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')
const yaml = require('js-yaml')

const { decodeBase64, getSeedNameFromShoot } = utils

exports.list = async function ({ user, namespace, shootsWithIssuesOnly = false }) {
  const client = user.client
  const query = {}
  if (shootsWithIssuesOnly) {
    query.labelSelector = 'shoot.garden.sapcloud.io/status!=healthy'
  }
  if (!namespace) {
    return client['core.gardener.cloud'].shoots.listAllNamespaces(query)
  }
  return client['core.gardener.cloud'].shoots.list(namespace, query)
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.client
  const username = user.id

  const annotations = {
    'garden.sapcloud.io/createdBy': username
  }
  if (_.get(body, 'spec.addons.kyma.enabled', false)) {
    annotations['experimental.addons.shoot.gardener.cloud/kyma'] = 'enabled'
  }
  body = _.merge({}, body, { metadata: { namespace, annotations } })
  _.unset(body, 'spec.addons.kyma')
  return client['core.gardener.cloud'].shoots.create(namespace, body)
}

async function read ({ user, namespace, name }) {
  const client = user.client

  return client['core.gardener.cloud'].shoots.get(namespace, name)
}
exports.read = read

async function patch ({ user, namespace, name, body }) {
  const client = user.client
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}
exports.patch = patch

exports.replace = async function ({ user, namespace, name, body }) {
  const client = user.client

  const { metadata, kind, apiVersion, status } = await client['core.gardener.cloud'].shoots.get(namespace, name)
  const {
    metadata: { labels, annotations },
    spec
  } = body
  // assign new labels and annotations to metadata
  Object.assign(metadata, { labels, annotations })
  // compose new body
  body = { kind, apiVersion, metadata, spec, status }
  // replace
  return client['core.gardener.cloud'].shoots.update(namespace, name, body)
}

exports.replaceVersion = async function ({ user, namespace, name, body }) {
  const client = user.client
  const version = body.version
  const patchOperations = [{
    op: 'replace',
    path: '/spec/kubernetes/version',
    value: version
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, name, patchOperations)
}

exports.replaceHibernationEnabled = async function ({ user, namespace, name, body }) {
  const client = user.client
  const enabled = !!body.enabled
  const payload = {
    spec: {
      hibernation: {
        enabled
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceHibernationSchedules = async function ({ user, namespace, name, body }) {
  const client = user.client
  const schedules = body
  const payload = {
    spec: {
      hibernation: {
        schedules
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceAddons = async function ({ user, namespace, name, body }) {
  const client = user.client
  const { kyma = {}, ...addons } = body
  const payload = {
    spec: {
      addons
    }
  }
  if (kyma.enabled) {
    payload.metadata = {
      annotations: {
        'experimental.addons.shoot.gardener.cloud/kyma': 'enabled'
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.kyma = async function ({ user, namespace, name }) {
  const client = user.client
  try {
    const shootClient = await client.createKubeconfigClient({ namespace, name: `${name}.kubeconfig` })
    const [{
      data: {
        'global.ingress.domainName': domain
      }
    }, {
      data: {
        email, password, username
      }
    }] = await Promise.all([
      shootClient.core.configmaps.get('kyma-installer', 'net-global-overrides'),
      shootClient.core.secrets.get('kyma-system', 'admin-user')
    ])
    return {
      url: `https://console.${domain}`,
      email: decodeBase64(email),
      username: decodeBase64(username),
      password: decodeBase64(password)
    }
  } catch (err) {
    logger.error('Failed to fetch kyma addon info', err)
    const statusCode = 404
    let statusMessage
    if (isHttpError(err, 404)) {
      statusMessage = 'Kubeconfig for cluster does not exist'
    } else if (/^ECONNRE/.test(err.code)) {
      statusMessage = 'Connection to cluster could not be estalished'
    } else {
      statusMessage = 'Kyma not correctly installed in cluster'
    }
    const response = { statusCode, statusMessage }
    throw new HTTPError(response)
  }
}

exports.replaceWorkers = async function ({ user, namespace, name, body }) {
  const client = user.client
  const workers = body
  const patchOperations = [{
    op: 'replace',
    path: `/spec/provider/workers`,
    value: workers
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, name, patchOperations)
}

exports.replaceMaintenance = async function ({ user, namespace, name, body }) {
  const client = user.client
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
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

const patchAnnotations = async function ({ user, namespace, name, annotations }) {
  const client = user.client
  const body = {
    metadata: {
      annotations: annotations
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}
exports.patchAnnotations = patchAnnotations

exports.remove = async function ({ user, namespace, name }) {
  const client = user.client
  const annotations = {
    'confirmation.garden.sapcloud.io/deletion': 'true'
  }
  await patchAnnotations({ user, namespace, name, annotations })

  return client['core.gardener.cloud'].shoots.delete(namespace, name)
}

exports.info = async function ({ user, namespace, name }) {
  const client = user.client

  const [
    shoot,
    secret
  ] = await Promise.all([
    read({
      user,
      namespace,
      name
    }),
    client.getSecret({
      namespace,
      name: `${name}.kubeconfig`,
      throwNotFound: false
    })
  ])

  const project = await client.getProjectByNamespace(namespace)
  const projectName = project.metadata.name

  const data = {}
  let seed
  if (shoot.spec.seedName) {
    seed = getSeed(getSeedNameFromShoot(shoot))
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
    if (seed) {
      try {
        const seedClient = await client.createKubeconfigClient(seed.spec.secretRef)
        const seedShootNamespace = shoot.status.technicalID
        await assignComponentSecrets(seedClient, data, seedShootNamespace)
      } catch (err) {
        logger.error('Failed to retrieve information using seed core client', err)
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

function getSecret (client, { namespace, name }) {
  try {
    return client.core.secrets.get(namespace, name)
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
