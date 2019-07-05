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

const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources
const {
  getSeedKubeconfig,
  getShootIngressDomain,
  getConfigValue,
  readServiceAccountToken,
  // getTargetClusterClientConfig,
  getSoilIngressDomainForSeed
} = require('../utils')
const {
  COMPONENT_TERMINAL,
  toTerminalResource
} = require('../utils/terminals/terminalResources')
const { getSeeds } = require('../cache')
const authorization = require('./authorization')
const shoots = require('./shoots')
const { Forbidden } = require('../errors')
const logger = require('../logger')
const fnv = require('fnv-plus')

const TERMINAL_CONTAINER_NAME = 'terminal'

function Garden ({ auth }) {
  return kubernetes.garden({ auth })
}

function Gardenext ({ auth }) {
  return kubernetes.gardenext({ auth })
}

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function initializeTerminalObject ({ user, scheduleNamespace, kubeApiServer }) {
  return {
    namespace: scheduleNamespace,
    container: TERMINAL_CONTAINER_NAME,
    server: kubeApiServer
  }
}

async function existsShoot ({ gardenClient, seedName }) {
  try {
    await shoots.read({ gardenClient, namespace: 'garden', name: seedName })
    return true
  } catch (err) {
    if (err.code === 404) {
      return false
    }
    throw err
  }
}

async function getTerminalIngress ({ user, seed }) {
  const gardenClient = Garden(user)
  const isSoil = _.get(seed, ['metadata', 'labels', 'garden.sapcloud.io/role']) === 'soil' || !await existsShoot({ gardenClient, seedName: seed.metadata.name })
  let soilIngressDomain
  let serviceName
  let namespace
  const projectsClient = gardenClient.projects
  const namespacesClient = Core(user).namespaces
  if (isSoil) {
    const soilSeed = seed
    soilIngressDomain = await getSoilIngressDomainForSeed(projectsClient, namespacesClient, soilSeed)
    namespace = 'garden'
  } else {
    const seedName = seed.metadata.name
    const seedShootResource = await readShoot({ user, namespace: 'garden', name: seedName })
    soilIngressDomain = await getShootIngressDomain(projectsClient, namespacesClient, seedShootResource)

    const seedShootNS = _.get(seedShootResource, 'status.technicalID')
    if (!seedShootNS) {
      throw new Error(`could not get namespace for seed ${seedName} on soil`)
    }

    serviceName = 'kube-apiserver'
    namespace = seedShootNS
  }
  const secretRef = _.get(seed, 'spec.secretRef')

  const host = `api.${soilIngressDomain}`
  return {
    namespace,
    host,
    serviceName,
    secretRef
  }
}

async function readShoot ({ user, namespace, name }) {
  try {
    return await shoots.read({ user, namespace, name })
  } catch (err) {
    if (err.code !== 404) {
      throw err
    }
    return undefined
  }
}

async function findExistingTerminalResource ({ gardenextClient, username, namespace, name, target }) {
  let selectors = [
    `component=${COMPONENT_TERMINAL}`,
    `garden.sapcloud.io/targetType=${target}`,
    `garden.sapcloud.io/createdBy=${fnv.hash(username, 64).str()}`
  ]
  if (!_.isEmpty(name)) {
    selectors = _.concat(selectors, `garden.sapcloud.io/name=${name}`)
  }
  const qs = { labelSelector: selectors.join(',') }
  try {
    let { items: existingTerminals } = await gardenextClient.ns(namespace).terminals.get({ qs })
    existingTerminals = _.filter(existingTerminals, terminal => _.isEmpty(terminal.metadata.deletionTimestamp))
    const existingTerminal = _.find(existingTerminals, item => item.metadata.annotations['garden.sapcloud.io/createdBy'] === username)
    return existingTerminal
  } catch (e) {
    throw e
  }
}

async function findExistingTerminal ({ gardenextClient, hostCoreClient, scheduleNamespace, username, namespace, name, target }) {
  let existingTerminal = await findExistingTerminalResource({ gardenextClient, username, namespace, name, target })

  if (!existingTerminal) {
    return undefined
  }
  if (!isTerminalReady(existingTerminal)) {
    // TODO handle timeout?
    existingTerminal = readTerminalUntilReady({ gardenextClient, namespace, name })
  }
  const pod = existingTerminal.status.podName
  const attachServiceAccount = existingTerminal.status.attachServiceAccountName

  const waitUntilReady = false // if the service account token is not there it is maybe in the process of beeing deleted -> handle as create new terminal
  const serviceAccountTokenObj = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: scheduleNamespace, serviceAccountName: attachServiceAccount, waitUntilReady })
  const token = _.get(serviceAccountTokenObj, 'token')
  if (_.isEmpty(token)) {
    // TODO delete terminal resource?
    return undefined
  }

  logger.debug(`Found terminal session for user ${username}: ${existingTerminal.metadata.name}`)
  return { pod, token, attachServiceAccount }
}

exports.create = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  ensureTerminalAllowed({ isAdmin, target })

  const context = await getContext({ user, namespace, name, target })
  const { scheduleNamespace, hostClientConfig, kubeApiServer } = context

  const terminalInfo = initializeTerminalObject({ user, scheduleNamespace, kubeApiServer })
  return getOrCreateTerminalSession({ user, hostClientConfig, terminalInfo, scheduleNamespace, username, namespace, name, target, context })
}

async function getRuntimeClusterSecrets ({ gardenCoreClient }) {
  const qs = { labelSelector: 'runtime=garden' }
  return gardenCoreClient.ns('garden').secrets.get({ qs })
}

async function getGardenRuntimeClusterSecretRef ({ gardenCoreClient }) {
  const { items: runtimeSecrets } = await getRuntimeClusterSecrets({ gardenCoreClient })
  const secret = _.head(runtimeSecrets)
  if (!secret) {
    throw new Error('could not fetch garden runtime secret')
  }
  const { metadata: { name, namespace } } = secret
  return {
    name,
    namespace
  }
}

async function getContext ({ user, namespace, name, target }) {
  let scheduleNamespace
  let targetCredentials
  let hostSecretRef
  let kubecfgCtxNamespaceTargetCluster
  let seedName
  let bindingKind
  let targetNamespace
  let kubeApiServer

  const gardenCoreClient = Core(user)

  if (target === 'garden') {
    seedName = getConfigValue({ path: 'terminal.gardenCluster.seed' })
    scheduleNamespace = getConfigValue({ path: 'terminal.gardenCluster.namespace' })
    kubeApiServer = _.head(getConfigValue({ path: 'terminal.gardenCluster.kubeApiServer.hosts' }))
    kubecfgCtxNamespaceTargetCluster = namespace
    targetNamespace = 'garden'

    targetCredentials = {
      serviceAccountRef: {
        name: getConfigValue({ path: 'terminal.gardenCluster.serviceAccountName', defaultValue: 'dashboard-terminal-admin' }),
        namespace: 'garden'
      }
    }
    hostSecretRef = await getGardenRuntimeClusterSecretRef({ gardenCoreClient })

    bindingKind = 'ClusterRoleBinding'
  } else {
    const shootResource = await shoots.read({ user, namespace, name })
    const seedShootNS = getSeedShootNamespace(shootResource)
    scheduleNamespace = seedShootNS
    seedName = shootResource.spec.cloud.seed
    const seed = _.find(getSeeds(), ['metadata.name', seedName])

    const { host } = await getTerminalIngress({ user, seed })
    kubeApiServer = host

    hostSecretRef = _.get(seed, 'spec.secretRef')

    if (target === 'shoot') {
      targetNamespace = undefined // this will create a temporary namespace
      kubecfgCtxNamespaceTargetCluster = 'default'

      targetCredentials = {
        secretRef: {
          name: `${name}.kubeconfig`,
          namespace
        }
      }
      bindingKind = 'ClusterRoleBinding'
    } else { // target cp
      kubecfgCtxNamespaceTargetCluster = seedShootNS
      targetNamespace = seedShootNS

      targetCredentials = {
        secretRef: _.get(seed, 'spec.secretRef')
      }
      bindingKind = 'RoleBinding'
    }
  }

  const seed = _.find(getSeeds(), ['metadata.name', seedName])
  if (!seed) {
    throw new Error(`Could not find seed with name ${seedName}`)
  }

  const seedKubeconfig = await getSeedKubeconfig({ coreClient: gardenCoreClient, seed })
  if (!seedKubeconfig) {
    throw new Error('could not fetch seed kubeconfig')
  }
  const hostClientConfig = kubernetes.fromKubeconfig(seedKubeconfig)

  return { seed, kubeApiServer, scheduleNamespace, kubecfgCtxNamespaceTargetCluster, targetCredentials, hostSecretRef, bindingKind, targetNamespace, hostClientConfig }
}

async function createTerminal ({ gardenextClient, user, namespace, name, target, context }) {
  const { scheduleNamespace, kubecfgCtxNamespaceTargetCluster, targetCredentials, bindingKind, targetNamespace, hostSecretRef } = context

  const containerImage = getConfigValue({ path: 'terminal.operator.image' })

  // const terminalIngress = await getTerminalIngress({ user, seed })

  const podLabels = getPodLabels(target)

  // const ingress = createIngress({ ...terminalIngress })
  const terminalHost = createHost({ namespace: scheduleNamespace, secretRef: hostSecretRef, containerImage, podLabels })
  const terminalTarget = createTarget({ kubeconfigContextNamespace: kubecfgCtxNamespaceTargetCluster, credentials: targetCredentials, bindingKind, namespace: targetNamespace })

  const labels = {
    'garden.sapcloud.io/targetType': target,
    'garden.sapcloud.io/targetNamespace': fnv.hash(terminalTarget.kubeconfigContextNamespace, 64).str(),
    'garden.sapcloud.io/createdBy': fnv.hash(user.id, 64).str()
  }
  if (!_.isEmpty(name)) {
    labels['garden.sapcloud.io/name'] = name
  }
  const annotations = {
    'garden.sapcloud.io/targetNamespace': terminalTarget.kubeconfigContextNamespace
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, annotations, labels, host: terminalHost, target: terminalTarget })

  return gardenextClient.ns(namespace).terminals.post({ body: terminalResource })
}

function getPodLabels (target) {
  let labels = {
    'networking.gardener.cloud/to-dns': 'allowed',
    'networking.gardener.cloud/to-public-networks': 'allowed',
    'networking.gardener.cloud/to-private-networks': 'allowed'
  }
  switch (target) {
    case 'garden':
      labels = {} // no network restrictions for now
      break
    case 'cp':
      labels['networking.gardener.cloud/to-seed-apiserver'] = 'allowed'
      break
    case 'shoot':
      labels['networking.gardener.cloud/to-shoot-apiserver'] = 'allowed'
      labels['networking.gardener.cloud/to-shoot-networks'] = 'allowed'
      break
  }
  return labels
}

// function createIngress ({ namespace, secretRef, serviceName, host }) {
//   return {
//     credentials: {
//       secretRef
//     },
//     namespace,
//     kubeApiServer: {
//       serviceName,
//       host
//     }
//   }
// }

function createHost ({ secretRef, namespace, containerImage, podLabels }) {
  const host = {
    credentials: {
      secretRef
    },
    namespace,
    pod: {
      labels: podLabels,
      containerImage
    }
  }

  return host
}

function createTarget ({ kubeconfigContextNamespace, credentials, bindingKind, namespace }) {
  const temporaryNamespace = _.isEmpty(namespace)
  return {
    credentials,
    kubeconfigContextNamespace,
    bindingKind,
    roleName: 'cluster-admin',
    namespace,
    temporaryNamespace
  }
}

function isTerminalReady (terminal) {
  return !_.isEmpty(_.get(terminal, 'status.podName')) && !_.isEmpty(_.get(terminal, 'status.attachServiceAccountName'))
}

async function readTerminalUntilReady ({ gardenextClient, namespace, name }) {
  const conditionFunction = isTerminalReady
  const watch = gardenextClient.ns(namespace).terminals.watch({ name })
  return kubernetes.waitUntilResourceHasCondition({ watch, conditionFunction, resourceName: Resources.Terminal.name, waitTimeout: 10 * 1000 })
}

async function getOrCreateTerminalSession ({ user, hostClientConfig, terminalInfo, scheduleNamespace, username, namespace, name, target, context }) {
  const gardenextClient = Gardenext(user)
  const hostCoreClient = kubernetes.core(hostClientConfig)

  const existingTerminal = await findExistingTerminal({ gardenextClient, hostCoreClient, scheduleNamespace, username, namespace, name, target })
  if (existingTerminal) {
    _.assign(terminalInfo, existingTerminal)
    return terminalInfo
  }

  logger.debug(`No terminal found for user ${username}. Creating new..`)
  let terminalResource = await createTerminal({ gardenextClient, user, namespace, name, target, context })

  terminalResource = await readTerminalUntilReady({ gardenextClient, namespace, name: terminalResource.metadata.name })

  const attachServiceAccountToken = await readServiceAccountToken({ coreClient: hostCoreClient, namespace: scheduleNamespace, serviceAccountName: terminalResource.status.attachServiceAccountName })

  const pod = terminalResource.status.podName
  _.assign(terminalInfo, { pod, token: attachServiceAccountToken.token })
  return terminalInfo
}

function getSeedShootNamespace (shoot) {
  const seedShootNS = _.get(shoot, 'status.technicalID')
  if (_.isEmpty(seedShootNS)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNS
}

function ensureTerminalAllowed ({ isAdmin }) {
  const terminalAllowed = isAdmin
  if (!terminalAllowed) {
    throw new Forbidden('Terminal usage is not allowed for this target')
  }
}

exports.heartbeat = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  ensureTerminalAllowed({ isAdmin, target })

  const gardenextClient = Gardenext(user)

  const terminal = await findExistingTerminalResource({ gardenextClient, username, namespace, name, target })
  if (!terminal) {
    throw new Error(`Can't process heartbeat, cannot find terminal resource for ${namespace}/${name} with target ${target}`)
  }

  const annotations = {
    'terminal.garden.sapcloud.io/operation': `keepalive`
  }
  try {
    const name = terminal.metadata.name
    await gardenextClient.ns(namespace).terminals.mergePatch({ name, body: { metadata: { annotations } } })
  } catch (e) {
    logger.error(`Could not update terminal on heartbeat. Error: ${e}`)
    throw new Error(`Could not update terminal on heartbeat`)
  }
}
