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
const fnv = require('fnv-plus')

const kubernetes = require('../../kubernetes')
const Resources = kubernetes.Resources
const {
  getKubeconfig,
  getConfigValue,
  decodeBase64
} = require('../../utils')
const {
  toTerminalResource
} = require('./terminalResources')
const {
  getKubeApiServerHostForSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterSecretRef,
  getGardenHostClusterKubeApiServer
} = require('./utils')
const { getSeed } = require('../../cache')
const shoots = require('../shoots')
const { Forbidden, BadRequest } = require('../../errors')
const logger = require('../../logger')

const TERMINAL_CONTAINER_NAME = 'terminal'

const TargetEnum = {
  GARDEN: 'garden',
  CONTROL_PLANE: 'cp',
  SHOOT: 'shoot'
}

function Garden ({ auth }) {
  return kubernetes.garden({ auth })
}

function GardenerDashboard ({ auth }) {
  return kubernetes.gardenerDashboard({ auth })
}

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function fromNodeResource ({ metadata, status = {} }) {
  const { name, creationTimestamp, labels } = metadata
  const version = _.get(status, 'nodeInfo.kubeletVersion')
  const conditions = _.get(status, 'conditions')
  const readyCondition = _.find(conditions, condition => condition.type === 'Ready')
  const readyStatus = _.get(readyCondition, 'status', 'UNKNOWN')
  return {
    metadata: {
      name,
      creationTimestamp
    },
    data: {
      kubernetesHostname: labels['kubernetes.io/hostname'],
      version,
      readyStatus
    }
  }
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
  return decodeBase64(secret.data.token)
}

function isServiceAccountReady ({ secrets } = {}) {
  const secretName = _.get(_.first(secrets), 'name')
  return !_.isEmpty(secretName)
}

async function findExistingTerminalResource ({ dashboardClient, username, namespace, name, hostCluster, targetCluster }) {
  let selectors = [
    `dashboard.gardener.cloud/hostCluster=${fnv.hash(JSON.stringify(hostCluster), 64).str()}`,
    `dashboard.gardener.cloud/targetCluster=${fnv.hash(JSON.stringify(targetCluster), 64).str()}`,
    `garden.sapcloud.io/createdBy=${fnv.hash(username, 64).str()}`
  ]
  if (!_.isEmpty(name)) {
    selectors = _.concat(selectors, `garden.sapcloud.io/name=${name}`)
  }
  const qs = { labelSelector: selectors.join(',') }

  let { items: existingTerminals } = await dashboardClient.ns(namespace).terminals.get({ qs })
  return _.chain(existingTerminals)
    .filter(terminal => _.isEmpty(terminal.metadata.deletionTimestamp))
    .filter(terminal => terminal.metadata.annotations['garden.sapcloud.io/createdBy'] === username)
    .head(existingTerminals)
    .value()
}

async function findExistingTerminal ({ dashboardClient, hostCoreClient, username, namespace, name, hostCluster, targetCluster }) {
  let existingTerminal = await findExistingTerminalResource({ dashboardClient, username, namespace, name, hostCluster, targetCluster })

  if (!existingTerminal) {
    return undefined
  }
  if (!isTerminalReady(existingTerminal)) {
    existingTerminal = await readTerminalUntilReady({ dashboardClient, namespace, name })
  }
  const podName = existingTerminal.status.podName
  const attachServiceAccount = existingTerminal.status.attachServiceAccountName
  const hostNamespace = existingTerminal.spec.host.namespace

  const waitUntilReady = false // if the service account token is not there it is maybe in the process of beeing deleted -> handle as create new terminal
  const token = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: hostNamespace, serviceAccountName: attachServiceAccount, waitUntilReady })
  if (_.isEmpty(token)) {
    // TODO delete terminal resource?
    return undefined
  }

  logger.debug(`Found terminal session for user ${username}: ${existingTerminal.metadata.name}`)
  return { podName, token, hostNamespace, terminal: existingTerminal }
}

exports.create = function ({ user, namespace, name, target, body = {} }) {
  return getOrCreateTerminalSession({ user, namespace, name, target, body })
}

exports.remove = function ({ user, namespace, name, target, body = {} }) {
  return deleteTerminalSession({ user, namespace, name, target, body })
}

async function deleteTerminalSession ({ user, namespace, name, target, body }) {
  const username = user.id

  const dashboardClient = GardenerDashboard(user)

  let terminalResourceName = body.name
  if (terminalResourceName) {
    const terminal = await dashboardClient.ns(namespace).terminals.get({ name: terminalResourceName })
    if (terminal.metadata.annotations['garden.sapcloud.io/createdBy'] !== username) {
      throw new Forbidden(`You are not allowed to delete terminal with name ${terminalResourceName}`)
    }
  } else { // fallback if no terminal resource name is given
    const [
      hostCluster,
      targetCluster
    ] = await Promise.all([
      getHostCluster({ user, namespace, name, target, body }),
      getTargetCluster({ user, namespace, name, target })
    ])

    const terminal = await findExistingTerminalResource({ dashboardClient, username, namespace, name, hostCluster, targetCluster })
    terminalResourceName = terminal.metadata.name
  }
  return dashboardClient.ns(namespace).terminals.delete({ name: terminalResourceName })
}

async function getTargetCluster ({ user, namespace, name, target }) {
  const targetCluster = {
    kubeconfigContextNamespace: undefined,
    namespace: undefined, // this is the namespace where the "access" service account will be created
    credentials: undefined,
    roleName: 'cluster-admin',
    bindingKind: undefined
  }

  switch (target) {
    case TargetEnum.GARDEN: {
      assert.strictEqual(user.isAdmin, true, 'user is not admin')

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
      const shootResource = await shoots.read({ user, namespace, name })
      const seedShootNS = getSeedShootNamespace(shootResource)
      const seedName = shootResource.spec.cloud.seed
      const seed = getSeed(seedName)

      targetCluster.kubeconfigContextNamespace = seedShootNS
      targetCluster.namespace = seedShootNS
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

async function getGardenTerminalHostCluster ({ gardenClient, gardenCoreClient, body }) {
  const hostCluster = {}
  hostCluster.config = getImageConfigFromBody(body)

  const [
    secretRef,
    kubeApiServer
  ] = await Promise.all([
    await getGardenTerminalHostClusterSecretRef({ coreClient: gardenCoreClient }),
    await getGardenHostClusterKubeApiServer({ gardenClient, coreClient: gardenCoreClient, shootsService: shoots })
  ])

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = secretRef
  hostCluster.kubeApiServer = kubeApiServer
  return hostCluster
}

async function getSeedHostCluster ({ gardenClient, gardenCoreClient, namespace, name, target, body }) {
  const hostCluster = {}
  hostCluster.config = getImageConfigFromBody(body)

  const shootResource = await shoots.read({ gardenClient, namespace, name })
  if (target === TargetEnum.SHOOT) {
    hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)
  }

  const seedShootNS = getSeedShootNamespace(shootResource)
  const seedName = shootResource.spec.cloud.seed
  const seed = getSeed(seedName)

  hostCluster.namespace = seedShootNS
  hostCluster.secretRef = _.get(seed, 'spec.secretRef')
  hostCluster.kubeApiServer = await getKubeApiServerHostForSeed({ gardenClient, coreClient: gardenCoreClient, shootsService: shoots, seed })
  return hostCluster
}

async function getShootHostCluster ({ gardenClient, gardenCoreClient, namespace, name, target, body }) {
  assert.strictEqual(target, TargetEnum.SHOOT, 'unexpected target')

  const hostCluster = {}
  hostCluster.config = getConfigFromBody(body)

  const shootResource = await shoots.read({ gardenClient, namespace, name })
  hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = {
    namespace,
    name: `${name}.kubeconfig`
  }
  hostCluster.kubeApiServer = await getKubeApiServerHostForShoot({ gardenClient, coreClient: gardenCoreClient, shootResource })
  return hostCluster
}

function getImageConfigFromBody (body) {
  return _.pick(body, ['containerImage'])
}

function getConfigFromBody (body) {
  return _.pick(body, ['node', 'containerImage', 'privileged', 'hostPID', 'hostNetwork'])
}

function getHostCluster ({ user, namespace, name, target, body }) {
  const gardenClient = Garden(user)
  const gardenCoreClient = Core(user)

  if (target === TargetEnum.GARDEN) {
    return getGardenTerminalHostCluster({ gardenClient, gardenCoreClient, body })
  }

  const defaultHost = user.isAdmin ? 'seed' : 'shoot'
  const preferredHost = _.get(body, 'preferredHost', defaultHost)
  if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluser is the seed
    return getSeedHostCluster({ gardenClient, gardenCoreClient, namespace, name, target, body })
  }

  // host cluster is the shoot
  return getShootHostCluster({ gardenClient, gardenCoreClient, namespace, name, target, body })
}

async function createTerminal ({ dashboardClient, user, namespace, name, target, hostCluster, targetCluster }) {
  const containerImage = getContainerImage({ isAdmin: user.isAdmin, preferredContainerImage: hostCluster.containerImage })

  const podLabels = getPodLabels(target)

  const terminalHost = createHost({ namespace: hostCluster.namespace, secretRef: hostCluster.secretRef, containerImage, podLabels, ...hostCluster.config })
  const terminalTarget = createTarget({ ...targetCluster })

  const labels = {
    'dashboard.gardener.cloud/hostCluster': fnv.hash(JSON.stringify(hostCluster), 64).str(),
    'dashboard.gardener.cloud/targetCluster': fnv.hash(JSON.stringify(targetCluster), 64).str(),
    'garden.sapcloud.io/createdBy': fnv.hash(user.id, 64).str()
  }
  if (!_.isEmpty(name)) {
    labels['garden.sapcloud.io/name'] = name
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, labels, host: terminalHost, target: terminalTarget })

  return dashboardClient.ns(namespace).terminals.post({ body: terminalResource })
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

function isTerminalReady (terminal) {
  return !_.isEmpty(_.get(terminal, 'status.podName')) && !_.isEmpty(_.get(terminal, 'status.attachServiceAccountName'))
}

async function readTerminalUntilReady ({ dashboardClient, namespace, name }) {
  const conditionFunction = isTerminalReady
  const watch = dashboardClient.ns(namespace).terminals.watch({ name })
  return kubernetes.waitUntilResourceHasCondition({ watch, conditionFunction, resourceName: Resources.Terminal.name, waitTimeout: 10 * 1000 })
}

async function getOrCreateTerminalSession ({ user, namespace, name, target, body }) {
  const username = user.id

  const [
    hostCluster,
    targetCluster
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, body }),
    getTargetCluster({ user, namespace, name, target })
  ])

  if (hostCluster.isHostOrTargetHibernated) {
    throw new Error('Hosting cluster or target cluster is hibernated')
  }

  const terminalInfo = {
    container: TERMINAL_CONTAINER_NAME,
    server: hostCluster.kubeApiServer
  }

  const dashboardClient = GardenerDashboard(user)
  const gardenCoreClient = Core(user)

  const hostKubeconfig = await getKubeconfig({ coreClient: gardenCoreClient, ...hostCluster.secretRef })
  if (!hostKubeconfig) {
    throw new Error('Host kubeconfig does not exist (yet)')
  }
  const hostCoreClient = kubernetes.core(kubernetes.fromKubeconfig(hostKubeconfig))

  const existingTerminal = await findExistingTerminal({ dashboardClient, hostCoreClient, username, namespace, name, hostCluster, targetCluster })
  if (existingTerminal) {
    _.assign(terminalInfo, {
      podName: existingTerminal.podName,
      token: existingTerminal.token,
      hostNamespace: existingTerminal.hostNamespace,
      name: existingTerminal.terminal.metadata.name
    })
    // do not wait for keepalive to return - run in parallel
    setKeepaliveAnnotation({ dashboardClient, terminal: existingTerminal.terminal, namespace })
      .catch(_.noop) // ignore error
    return terminalInfo
  }

  logger.debug(`No terminal found for user ${username}. Creating new..`)
  let terminalResource = await createTerminal({ dashboardClient, user, namespace, name, target, hostCluster, targetCluster })

  terminalResource = await readTerminalUntilReady({ dashboardClient, namespace, name: terminalResource.metadata.name })

  const token = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: terminalResource.spec.host.namespace, serviceAccountName: terminalResource.status.attachServiceAccountName })

  const podName = terminalResource.status.podName
  _.assign(terminalInfo, {
    podName,
    token,
    hostNamespace: terminalResource.spec.host.namespace,
    name: terminalResource.metadata.name
  })
  return terminalInfo
}

function getSeedShootNamespace (shoot) {
  const seedShootNS = _.get(shoot, 'status.technicalID')
  if (_.isEmpty(seedShootNS)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNS
}

async function ensureTerminalAllowed ({ isAdmin, target }) {
  if (isAdmin) {
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

exports.heartbeat = async function ({ user, namespace, body = {} }) {
  const username = user.id

  const dashboardClient = GardenerDashboard(user)

  let terminalResourceName = body.name
  if (!terminalResourceName) {
    throw new BadRequest('name is required')
  }

  const terminal = await dashboardClient.ns(namespace).terminals.get({ name: terminalResourceName })
  if (terminal.metadata.annotations['garden.sapcloud.io/createdBy'] !== username) {
    throw new Forbidden(`You are not allowed to keep terminal session alive with name ${terminalResourceName}`)
  }

  await setKeepaliveAnnotation({ dashboardClient, terminal, namespace })
  return { ok: true }
}

async function setKeepaliveAnnotation ({ dashboardClient, terminal, namespace }) {
  const annotations = {
    'dashboard.gardener.cloud/operation': `keepalive`
  }
  try {
    const name = terminal.metadata.name
    await dashboardClient.ns(namespace).terminals.mergePatch({ name, body: { metadata: { annotations } } })
  } catch (e) {
    logger.error('Could not keepalive terminal:', e)
    throw new Error('Could not keepalive terminal')
  }
}

exports.config = async function ({ user, namespace, name, target }) {
  const config = {
    image: getContainerImage({ isAdmin: user.isAdmin })
  }

  if (target === TargetEnum.SHOOT) {
    const gardenClient = Garden(user)
    const gardenCoreClient = Core(user)

    const { secretRef: { namespace: secretNamespace, name: secretName } } = await getShootHostCluster({ gardenClient, gardenCoreClient, namespace, name, target })

    const secret = await gardenCoreClient.ns(secretNamespace).secrets.get({ name: secretName })
    const kubeconfig = decodeBase64(secret.data.kubeconfig)
    const clientConfig = kubernetes.fromKubeconfig(kubeconfig)
    const coreClient = kubernetes.core(clientConfig)

    const { items: nodes } = await coreClient.nodes.get({})
    config.nodes = _.map(nodes, node => fromNodeResource(node))
  }
  return config
}
