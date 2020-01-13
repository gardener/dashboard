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

const _ = require('lodash')
const assert = require('assert').strict
const hash = require('object-hash')

const { isHttpError } = require('../../kubernetes-client')

const {
  decodeBase64,
  getConfigValue,
  getSeedNameFromShoot
} = require('../../utils')

const {
  toTerminalResource,
  fromNodeResource
} = require('./terminalResources')

const {
  getKubeApiServerHostForSeedOrShootedSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterSecretRef,
  getGardenHostClusterKubeApiServer
} = require('./utils')

const {
  Bootstrapper
} = require('./terminalBootstrap')

const { getSeed } = require('../../cache')
const { Forbidden, UnprocessableEntity } = require('../../errors')
const logger = require('../../logger')

const TERMINAL_CONTAINER_NAME = 'terminal'

const TargetEnum = {
  GARDEN: 'garden',
  CONTROL_PLANE: 'cp',
  SHOOT: 'shoot'
}

exports.create = function ({ user, coordinate: { namespace, name, target }, body = {} }) {
  return getOrCreateTerminalSession({ user, namespace, name, target, body })
}

exports.config = async function ({ user, coordinate: { namespace, name, target } }) {
  return getTerminalConfig({ user, namespace, name, target })
}

exports.list = function ({ user, coordinate: { namespace } }) {
  return listTerminalSessions({ user, namespace })
}

exports.remove = function ({ user, body = {} }) {
  return deleteTerminalSession({ user, body })
}

exports.fetch = function ({ user, body = {} }) {
  return fetchTerminalSession({ user, body })
}

exports.heartbeat = async function ({ user, body = {} }) {
  return heartbeatTerminalSession({ user, body })
}

function toTerminalMetadata (terminal) {
  const metadata = _.pick(terminal.metadata, ['name', 'namespace'])
  metadata.identifier = _.get(terminal, 'metadata.annotations["dashboard.gardener.cloud/identifier"]')
  return metadata
}

async function readServiceAccountToken (client, { namespace, serviceAccountName }) {
  const serviceAccount = await client.core.serviceaccounts
    .watch(namespace, serviceAccountName)
    .waitFor(isServiceAccountReady, { timeout: 10 * 1000 })
  const secretName = getFirstServiceAccountSecret(serviceAccount)
  if (secretName) {
    const secret = await client.core.secrets.get(namespace, secretName)
    return decodeBase64(secret.data.token)
  }
}

function getFirstServiceAccountSecret (serviceAccount) {
  return _
    .chain(serviceAccount)
    .get('secrets')
    .first()
    .get('name')
    .value()
}

function isServiceAccountReady (serviceAccount) {
  return !_.isEmpty(getFirstServiceAccountSecret(serviceAccount))
}

async function listTerminals ({ user, namespace, identifier }) {
  const username = user.id
  const client = user.client

  const selectors = [
    `garden.sapcloud.io/createdBy=${hash(username)}`
  ]
  if (identifier) {
    selectors.push(`dashboard.gardener.cloud/identifier=${hash(identifier)}`)
  }
  const query = {
    labelSelector: selectors.join(',')
  }

  const terminals = await client['dashboard.gardener.cloud'].terminals.list(namespace, query)
  return _
    .chain(terminals)
    .get('items')
    .filter(terminal => _.isEmpty(terminal.metadata.deletionTimestamp))
    .filter(['metadata.annotations["garden.sapcloud.io/createdBy"]', username])
    .value()
}

async function findExistingTerminalResource ({ user, namespace, body }) {
  const { identifier } = body

  const existingTerminalList = await listTerminals({ user, namespace, identifier })
  return _.first(existingTerminalList)
}

async function deleteTerminalSession ({ user, body }) {
  const username = user.id
  const client = user.client

  const { namespace, name } = body

  try {
    const terminal = await getTerminalResource(client, { namespace, name })
    if (terminal.metadata.annotations['garden.sapcloud.io/createdBy'] !== username) {
      throw new Forbidden(`You are not allowed to delete terminal with name ${name}`)
    }
    await client['dashboard.gardener.cloud'].terminals.delete(namespace, name)
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }
  return { namespace, name }
}

function getShootResource ({ user, namespace, name, target }) {
  const client = user.client
  if (target === TargetEnum.GARDEN) {
    return
  }
  return client.getShoot({ namespace, name })
}

async function getTargetCluster ({ user, namespace, name, target, shootResource }) {
  const client = user.client
  const isAdmin = user.isAdmin

  const targetCluster = {
    kubeconfigContextNamespace: undefined,
    namespace: undefined, // this is the namespace where the "access" service account will be created
    credentials: undefined,
    roleName: 'cluster-admin',
    bindingKind: undefined
  }

  switch (target) {
    case TargetEnum.GARDEN: {
      assert.strictEqual(isAdmin, true, 'user is not admin')

      targetCluster.kubeconfigContextNamespace = namespace
      targetCluster.namespace = 'garden'
      targetCluster.credentials = getConfigValue('terminal.garden.operatorCredentials')
      targetCluster.bindingKind = 'ClusterRoleBinding'
      break
    }
    case TargetEnum.SHOOT: {
      targetCluster.kubeconfigContextNamespace = 'default'
      targetCluster.namespace = undefined // this will create a temporary namespace
      targetCluster.credentials = {
        secretRef: {
          name: `${name}.kubeconfig`,
          namespace
        }
      }
      targetCluster.bindingKind = 'ClusterRoleBinding'
      break
    }
    case TargetEnum.CONTROL_PLANE: {
      if (!shootResource) {
        shootResource = await client.getShoot({ namespace, name })
      }
      const seedShootNamespace = getSeedShootNamespace(shootResource)
      const seedName = getSeedNameFromShoot(shootResource)
      const seed = getSeed(seedName)

      targetCluster.kubeconfigContextNamespace = seedShootNamespace
      targetCluster.namespace = seedShootNamespace
      targetCluster.credentials = {
        secretRef: _.get(seed, 'spec.secretRef')
      }
      targetCluster.bindingKind = 'RoleBinding'
      break
    }
    default: {
      throw new Error(`unknown target ${target}`)
    }
  }
  return targetCluster
}

async function getGardenTerminalHostCluster (client, { body }) {
  const hostCluster = {}
  hostCluster.config = getImageConfigFromBody(body)

  const [
    secretRef,
    kubeApiServer
  ] = await Promise.all([
    await getGardenTerminalHostClusterSecretRef(client),
    await getGardenHostClusterKubeApiServer(client)
  ])

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = secretRef
  hostCluster.kubeApiServer = kubeApiServer
  return hostCluster
}

async function getSeedHostCluster (client, { namespace, name, target, body, shootResource }) {
  const hostCluster = {}
  hostCluster.config = getImageConfigFromBody(body)
  if (!shootResource) {
    shootResource = await client.getShoot({ namespace, name })
  }
  if (target === TargetEnum.SHOOT) {
    hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)
  }

  const seedShootNamespace = getSeedShootNamespace(shootResource)
  const seedName = getSeedNameFromShoot(shootResource)

  const seed = getSeed(seedName)

  hostCluster.namespace = seedShootNamespace
  hostCluster.secretRef = _.get(seed, 'spec.secretRef')
  hostCluster.kubeApiServer = await getKubeApiServerHostForSeedOrShootedSeed(client, seed)
  return hostCluster
}

async function getShootHostCluster (client, { namespace, name, target, body, shootResource }) {
  assert.strictEqual(target, TargetEnum.SHOOT, 'unexpected target')

  const hostCluster = {}
  hostCluster.config = getConfigFromBody(body)

  if (!shootResource) {
    shootResource = await client.getShoot({ namespace, name })
  }
  hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = {
    namespace,
    name: `${name}.kubeconfig`
  }
  hostCluster.kubeApiServer = await getKubeApiServerHostForShoot(shootResource)
  return hostCluster
}

function getImageConfigFromBody (body) {
  return _.pick(body, ['containerImage'])
}

function getConfigFromBody (body) {
  return _.pick(body, ['node', 'containerImage', 'privileged', 'hostPID', 'hostNetwork'])
}

function getHostCluster ({ user, namespace, name, target, body, shootResource }) {
  const client = user.client

  if (target === TargetEnum.GARDEN) {
    return getGardenTerminalHostCluster(client, { body })
  }

  const defaultHost = user.isAdmin ? 'seed' : 'shoot'
  const preferredHost = _.get(body, 'preferredHost', defaultHost)
  if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluser is the seed
    return getSeedHostCluster(client, { namespace, name, target, body, shootResource })
  }

  // host cluster is the shoot
  return getShootHostCluster(client, { namespace, name, target, body, shootResource })
}

async function createTerminal ({ user, namespace, name, target, hostCluster, targetCluster, body }) {
  const client = user.client
  const isAdmin = user.isAdmin
  const { identifier } = body
  const containerImage = getContainerImage({ isAdmin, preferredContainerImage: hostCluster.containerImage })

  const podLabels = getPodLabels(target)

  const terminalHost = createHost({ namespace: hostCluster.namespace, secretRef: hostCluster.secretRef, containerImage, podLabels, ...hostCluster.config })
  const terminalTarget = createTarget({ ...targetCluster })

  const labels = {
    'dashboard.gardener.cloud/hostCluster': hash(hostCluster),
    'dashboard.gardener.cloud/targetCluster': hash(targetCluster),
    'garden.sapcloud.io/createdBy': hash(user.id)
  }
  if (name) {
    labels['garden.sapcloud.io/name'] = name
  }
  if (identifier) {
    labels['dashboard.gardener.cloud/identifier'] = hash(identifier)
  }

  const annotations = {
    'dashboard.gardener.cloud/identifier': identifier
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, annotations, labels, host: terminalHost, target: terminalTarget })

  return client['dashboard.gardener.cloud'].terminals.create(namespace, terminalResource)
}

function getPodLabels (target) {
  let labels = {
    'networking.gardener.cloud/to-dns': 'allowed',
    'networking.gardener.cloud/to-public-networks': 'allowed',
    'networking.gardener.cloud/to-private-networks': 'allowed'
  }
  switch (target) {
    case TargetEnum.GARDEN:
      labels = {} // no network restrictions for now
      break
    case TargetEnum.CONTROL_PLANE:
      labels['networking.gardener.cloud/to-seed-apiserver'] = 'allowed'
      break
    case TargetEnum.SHOOT:
      labels['networking.gardener.cloud/to-shoot-apiserver'] = 'allowed'
      labels['networking.gardener.cloud/to-shoot-networks'] = 'allowed'
      break
  }
  return labels
}

function createHost ({ secretRef, namespace, containerImage, podLabels, node, privileged = false, hostPID = false, hostNetwork = false }) {
  const temporaryNamespace = _.isEmpty(namespace)
  const host = {
    credentials: {
      secretRef
    },
    namespace,
    temporaryNamespace,
    pod: {
      labels: podLabels,
      containerImage,
      privileged,
      hostPID,
      hostNetwork
    }
  }
  if (node) {
    host.pod.nodeSelector = {
      'kubernetes.io/hostname': node
    }
  }
  return host
}

function createTarget ({ kubeconfigContextNamespace, credentials, bindingKind, roleName = 'cluster-admin', namespace }) {
  const temporaryNamespace = _.isEmpty(namespace)
  return {
    credentials,
    kubeconfigContextNamespace,
    bindingKind,
    roleName,
    namespace,
    temporaryNamespace
  }
}

function readTerminalUntilReady ({ user, namespace, name }) {
  const username = user.id
  const client = user.client

  const isTerminalReady = terminal => {
    if (terminal.metadata.annotations['garden.sapcloud.io/createdBy'] !== username) {
      throw new Forbidden('You are not the user who created the terminal resource')
    }
    const podName = _.get(terminal, 'status.podName')
    const attachServiceAccountName = _.get(terminal, 'status.attachServiceAccountName')
    return podName && attachServiceAccountName
  }
  return client['dashboard.gardener.cloud'].terminals
    .watch(namespace, name)
    .waitFor(isTerminalReady, { timeout: 10 * 1000 })
}

async function getOrCreateTerminalSession ({ user, namespace, name, target, body = {} }) {
  const username = user.id
  const client = user.client
  const shootResource = await getShootResource({ user, namespace, name, target })

  const [
    hostCluster,
    targetCluster
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, body, shootResource }),
    getTargetCluster({ user, namespace, name, target, shootResource })
  ])

  if (hostCluster.isHostOrTargetHibernated) {
    throw new Error('Hosting cluster or target cluster is hibernated')
  }

  try {
    await client.getKubeconfig(hostCluster.secretRef)
  } catch (err) {
    throw new Error('Host kubeconfig does not exist (yet)')
  }

  let terminal = await findExistingTerminalResource({ user, namespace, name, hostCluster, targetCluster, body })
  if (!terminal) {
    logger.debug(`No terminal found for user ${username}. Creating new..`)
    terminal = await createTerminal({ user, namespace, name, target, hostCluster, targetCluster, body })
  } else {
    logger.debug(`Found terminal for user ${username}: ${terminal.metadata.name}`)
    // do not wait for keepalive to return - run in parallel
    setKeepaliveAnnotation(client, terminal)
      .catch(_.noop) // ignore error
  }

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      kubeApiServer: hostCluster.kubeApiServer,
      namespace: terminal.spec.host.namespace
    }
  }
}

async function createHostClient (client, secretRef) {
  try {
    return await client.createKubeconfigClient(secretRef)
  } catch (err) {
    if (isHttpError(err, 404)) {
      throw new Error('Host kubeconfig does not exist (yet)')
    }
    const { namespace, name } = secretRef
    logger.error(`Failed to create client from kubeconfig secret ${namespace}/${name}`, err)
    throw err
  }
}

async function fetchTerminalSession ({ user, body: { name, namespace } }) {
  const client = user.client

  const terminal = await readTerminalUntilReady({ user, name, namespace })
  const host = terminal.spec.host
  const hostClient = await createHostClient(client, host.credentials.secretRef)
  const token = await readServiceAccountToken(hostClient, {
    namespace: host.namespace,
    serviceAccountName: terminal.status.attachServiceAccountName
  })

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      token,
      pod: {
        name: terminal.status.podName,
        container: TERMINAL_CONTAINER_NAME
      }
    }
  }
}

async function listTerminalSessions ({ user, namespace }) {
  const terminals = await listTerminals({ user, namespace })

  return _.map(terminals, terminal => {
    return {
      metadata: toTerminalMetadata(terminal)
    }
  })
}

function getSeedShootNamespace (shoot) {
  const seedShootNamespace = _.get(shoot, 'status.technicalID')
  if (_.isEmpty(seedShootNamespace)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNamespace
}

async function ensureTerminalAllowed ({ method, isAdmin, target }) {
  if (isAdmin) {
    return
  }

  // list your terminal sessions is allowed for everybody
  if (method === 'list') {
    return
  }

  // non-admin users are only allowed to open terminals for shoots
  if (target === TargetEnum.SHOOT) {
    return
  }
  throw new Forbidden('Terminal usage is not allowed')
}
exports.ensureTerminalAllowed = ensureTerminalAllowed

function getContainerImage ({ isAdmin, preferredContainerImage }) {
  if (preferredContainerImage) {
    return preferredContainerImage
  }

  const containerImage = getConfigValue('terminal.containerImage')
  if (isAdmin) {
    return getConfigValue('terminal.containerImageOperator', containerImage)
  }
  return containerImage
}

async function heartbeatTerminalSession ({ user, body }) {
  const username = user.id
  const client = user.client

  const { name, namespace } = body
  const terminal = await getTerminalResource(client, { name, namespace })
  if (terminal.metadata.annotations['garden.sapcloud.io/createdBy'] !== username) {
    throw new Forbidden(`You are not allowed to keep terminal session alive with name ${terminal.metadata.name}`)
  }

  await setKeepaliveAnnotation(client, terminal)
  return { ok: true }
}

function getTerminalResource (client, { name, namespace }) {
  if (!name || !namespace) {
    throw new UnprocessableEntity('name and namespace are required')
  }

  return client['dashboard.gardener.cloud'].terminals.get(namespace, name)
}

async function setKeepaliveAnnotation (client, terminal) {
  const annotations = {
    'dashboard.gardener.cloud/operation': 'keepalive'
  }
  try {
    const { name, namespace } = terminal.metadata
    const body = { metadata: { annotations } }
    await client['dashboard.gardener.cloud'].terminals.mergePatch(namespace, name, body)
  } catch (err) {
    logger.error('Could not keepalive terminal:', err)
    throw new Error('Could not keepalive terminal')
  }
}

async function getTerminalConfig ({ user, namespace, name, target }) {
  const client = user.client
  const isAdmin = user.isAdmin

  const config = {
    image: getContainerImage({ isAdmin })
  }

  if (target === TargetEnum.SHOOT) {
    const secretRef = {
      namespace,
      name: `${name}.kubeconfig`
    }
    const hostClient = await client.createKubeconfigClient(secretRef)

    const nodeList = await hostClient.core.nodes.list()
    config.nodes = _
      .chain(nodeList)
      .get('items')
      .map(fromNodeResource)
      .value()
  }
  return config
}

exports.bootstrapper = new Bootstrapper()
