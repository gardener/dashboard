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
const { getSeeds } = require('../../cache')
const shoots = require('../shoots')
const { Forbidden } = require('../../errors')
const logger = require('../../logger')

const TERMINAL_CONTAINER_NAME = 'terminal'

const TARGET = {
  garden: 'garden',
  controlPlane: 'cp',
  shoot: 'shoot'
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

function fromResource ({ metadata, status = {} }) {
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
  const token = decodeBase64(secret.data.token)
  const caData = secret.data['ca.crt']
  return { token, caData }
}

function isServiceAccountReady ({ secrets } = {}) {
  const secretName = _.get(_.first(secrets), 'name')
  return !_.isEmpty(secretName)
}

function getConfigFromBody (body) {
  return _.pick(body, ['node', 'containerImage', 'privileged', 'hostPID', 'hostNetwork'])
}

async function findExistingTerminalResource ({ dashboardClient, username, namespace, name, hostCluster, targetCluster, body }) {

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
  existingTerminals = _.chain(existingTerminals)
    .filter(terminal => _.isEmpty(terminal.metadata.deletionTimestamp))
    .filter(terminal => terminal.metadata.annotations['garden.sapcloud.io/createdBy'] === username)
    .value()
  return _.head(existingTerminals)
}

async function findExistingTerminal ({ dashboardClient, hostCoreClient, username, namespace, name, hostCluster, targetCluster, body }) {
  let existingTerminal = await findExistingTerminalResource({ dashboardClient, username, namespace, name, hostCluster, targetCluster, body })

  if (!existingTerminal) {
    return undefined
  }
  if (!isTerminalReady(existingTerminal)) {
    existingTerminal = await readTerminalUntilReady({ dashboardClient, namespace, name })
  }
  const pod = existingTerminal.status.podName
  const attachServiceAccount = existingTerminal.status.attachServiceAccountName
  const hostNamespace = existingTerminal.spec.host.namespace

  const waitUntilReady = false // if the service account token is not there it is maybe in the process of beeing deleted -> handle as create new terminal
  const serviceAccountTokenObj = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: hostNamespace, serviceAccountName: attachServiceAccount, waitUntilReady })
  const token = _.get(serviceAccountTokenObj, 'token')
  if (_.isEmpty(token)) {
    // TODO delete terminal resource?
    return undefined
  }

  logger.debug(`Found terminal session for user ${username}: ${existingTerminal.metadata.name}`)
  return { pod, token, namespace: hostNamespace }
}

exports.create = async function ({ user, namespace, name, target, body = {} }) {
  return getOrCreateTerminalSession({ user, namespace, name, target, body })
}

exports.remove = async function ({ user, namespace, name, target, body = {} }) {
  return deleteTerminalSession({ user, namespace, name, target })
}

async function deleteTerminalSession ({ user, namespace, name, target, body }) {
  const username = user.id

  const [
    hostCluster,
    targetCluster
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, body }),
    getTargetCluster({ user, namespace, name, target })
  ])

  const dashboardClient = GardenerDashboard(user)

  const terminal = await findExistingTerminalResource({ dashboardClient, username, namespace, name, hostCluster, targetCluster })
  if (terminal) {
    await dashboardClient.ns(namespace).terminals.delete({ name: terminal.metadata.name })
  }
}

async function getTargetCluster ({ user, namespace, name, target }) {
  const targetCluster = {
    kubeconfigContextNamespace: undefined,
    namespace: undefined, // this is the namespace where the "access" service account will be created
    credentials: undefined,
    roleName: 'cluster-admin',
    bindingKind: undefined
  }

  if (target === TARGET.garden) {
    assert.strictEqual(user.isAdmin, true, 'user is not admin')

    targetCluster.kubeconfigContextNamespace = namespace
    targetCluster.namespace = 'garden'
    targetCluster.credentials = getConfigValue('terminal.garden.operatorCredentials')
    targetCluster.bindingKind = 'ClusterRoleBinding'
  } else {
    if (target === TARGET.shoot) {
      targetCluster.kubeconfigContextNamespace = 'default'
      targetCluster.namespace = undefined // this will create a temporary namespace
      targetCluster.credentials = {
        secretRef: {
          name: `${name}.kubeconfig`,
          namespace
        }
      }
      targetCluster.bindingKind = 'ClusterRoleBinding'
    } else if (target === TARGET.controlPlane) {
      const shootResource = await shoots.read({ user, namespace, name })
      const seedShootNS = getSeedShootNamespace(shootResource)
      const seedName = shootResource.spec.cloud.seed
      const seed = _.find(getSeeds(), ['metadata.name', seedName])

      targetCluster.kubeconfigContextNamespace = seedShootNS
      targetCluster.namespace = seedShootNS
      targetCluster.credentials = {
        secretRef: _.get(seed, 'spec.secretRef')
      }
      targetCluster.bindingKind = 'RoleBinding'
    } else {
      throw new Error(`unknown target ${target}`)
    }
  }
  return targetCluster
}

async function getHostCluster ({ user, namespace, name, target, body }) {
  const hostCluster = {
    namespace: undefined,
    secretRef: undefined,
    kubeApiServer: undefined,
    isHibernated: false // only applicable for shoot clusters
  }

  _.assign(hostCluster, getConfigFromBody(body))

  const gardenClient = Garden(user)
  const gardenCoreClient = Core(user)

  if (target === TARGET.garden) {
    hostCluster.namespace = undefined // this will create a temporary namespace
    hostCluster.secretRef = await getGardenTerminalHostClusterSecretRef({ coreClient: gardenCoreClient })
    hostCluster.kubeApiServer = await getGardenHostClusterKubeApiServer({ gardenClient, coreClient: gardenCoreClient, shootsService: shoots })
  } else {
    const shootResource = await shoots.read({ user, namespace, name })
    if (target === TARGET.shoot) {
      hostCluster.isHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)
    }

    if (user.isAdmin) { // as admin - host cluser is the seed
      const seedShootNS = getSeedShootNamespace(shootResource)
      const seedName = shootResource.spec.cloud.seed
      const seed = _.find(getSeeds(), ['metadata.name', seedName])

      hostCluster.namespace = seedShootNS
      hostCluster.secretRef = _.get(seed, 'spec.secretRef')
      hostCluster.kubeApiServer = await getKubeApiServerHostForSeed({ gardenClient, coreClient: gardenCoreClient, shootsService: shoots, seed })
    } else { // as enduser - host cluster is the shoot
      assert.strictEqual(target, TARGET.shoot, 'unexpected target')

      hostCluster.namespace = undefined // this will create a temporary namespace
      hostCluster.secretRef = {
        namespace,
        name: `${name}.kubeconfig`
      }
      hostCluster.kubeApiServer = await getKubeApiServerHostForShoot({ gardenClient, coreClient: gardenCoreClient, shootResource })
    }
  }
  return hostCluster
}

async function createTerminal ({ dashboardClient, user, namespace, name, target, hostCluster, targetCluster }) {
  const containerImage = getContainerImage({ isAdmin: user.isAdmin, preferredContainerImage: hostCluster.containerImage })

  const podLabels = getPodLabels(target)

  const terminalHost = createHost({ namespace: hostCluster.namespace, secretRef: hostCluster.secretRef, containerImage, podLabels, node: hostCluster.node, privileged: hostCluster.privileged, hostPID: hostCluster.hostPID, hostNetwork: hostCluster.hostNetwork })
  const terminalTarget = createTarget({ ...targetCluster })

  const labels = {
    'dashboard.gardener.cloud/hostCluster': fnv.hash(JSON.stringify(hostCluster), 64).str(),
    'dashboard.gardener.cloud/targetCluster': fnv.hash(JSON.stringify(targetCluster), 64).str(),
    'garden.sapcloud.io/createdBy': fnv.hash(user.id, 64).str()
  }
  if (!_.isEmpty(name)) {
    labels['garden.sapcloud.io/name'] = name
  }
  const annotations = {
    'dashboard.gardener.cloud/targetNamespace': terminalTarget.kubeconfigContextNamespace
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, annotations, labels, host: terminalHost, target: terminalTarget })

  return dashboardClient.ns(namespace).terminals.post({ body: terminalResource })
}

function getPodLabels (target) {
  let labels = {
    'networking.gardener.cloud/to-dns': 'allowed',
    'networking.gardener.cloud/to-public-networks': 'allowed',
    'networking.gardener.cloud/to-private-networks': 'allowed'
  }
  switch (target) {
    case TARGET.garden:
      labels = {} // no network restrictions for now
      break
    case TARGET.controlPlane:
      labels['networking.gardener.cloud/to-seed-apiserver'] = 'allowed'
      break
    case TARGET.shoot:
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

  if (hostCluster.isHibernated) {
    throw new Error('Hosting cluster is hibernated')
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

  const existingTerminal = await findExistingTerminal({ dashboardClient, hostCoreClient, username, namespace, name, hostCluster, targetCluster, body })
  if (existingTerminal) {
    _.assign(terminalInfo, existingTerminal)
    return terminalInfo
  }

  logger.debug(`No terminal found for user ${username}. Creating new..`)
  let terminalResource = await createTerminal({ dashboardClient, user, namespace, name, target, hostCluster, targetCluster })

  terminalResource = await readTerminalUntilReady({ dashboardClient, namespace, name: terminalResource.metadata.name })

  const { token } = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: terminalResource.spec.host.namespace, serviceAccountName: terminalResource.status.attachServiceAccountName })

  const pod = terminalResource.status.podName
  _.assign(terminalInfo, {
    pod,
    token,
    namespace: terminalResource.spec.host.namespace
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
  if (target === TARGET.shoot) {
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

exports.heartbeat = async function ({ user, namespace, name, target, body = {} }) {
  const username = user.id

  const [
    hostCluster,
    targetCluster
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, body }),
    getTargetCluster({ user, namespace, name, target })
  ])

  const dashboardClient = GardenerDashboard(user)

  const terminal = await findExistingTerminalResource({ dashboardClient, username, namespace, name, hostCluster, targetCluster })
  if (!terminal) {
    throw new Error(`Can't process heartbeat, cannot find terminal resource for ${namespace}/${name} with target ${target}`)
  }

  const annotations = {
    'dashboard.gardener.cloud/operation': `keepalive`
  }
  try {
    const name = terminal.metadata.name
    await dashboardClient.ns(namespace).terminals.mergePatch({ name, body: { metadata: { annotations } } })
  } catch (e) {
    logger.error(`Could not update terminal on heartbeat. Error: ${e}`)
    throw new Error(`Could not update terminal on heartbeat`)
  }
}

exports.config = async function ({ user, namespace, name, target }) {
  const { secretRef: { namespace: secretNamespace, name: secretName } } = await getHostCluster({ user, namespace, name, target })

  const secret = await Core(user).ns(secretNamespace).secrets.get({ name: secretName })
  const kubeconfig = decodeBase64(secret.data.kubeconfig)
  const clientConfig = kubernetes.fromKubeconfig(kubeconfig)
  const shootCore = kubernetes.core(clientConfig)

  const { items: nodes } = await shootCore.nodes.get({})

  const image = getContainerImage({ isAdmin: user.isAdmin })

  return {
    nodes: _.map(nodes, node => fromResource(node)),
    image
  }
}
