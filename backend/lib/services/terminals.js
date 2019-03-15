//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
  createOwnerRefArrayForResource,
  getConfigValue,
  readServiceAccountToken,
  getTargetClusterClientConfig
} = require('../utils')
const {
  COMPONENT_TERMINAL,
  toServiceAccountResource,
  toRoleBindingResource,
  toClusterRoleBindingResource,
  toPodResource
} = require('../utils/terminals/terminalResources')
const {
  CLUSTER_ROLE_TERMINAL_ATTACH,
  createKubeconfig,
  SaTypeEnum
} = require('../utils/terminals')
const { getSeeds } = require('../cache')
const authorization = require('./authorization')
const shoots = require('./shoots')
const { Forbidden } = require('../errors')
const logger = require('../logger')

const TERMINAL_CONTAINER_NAME = 'terminal'

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function getAnnotationTerminalUserAndTarget ({ username, target, targetClusterNamespace }) {
  const annotation = {
    'garden.sapcloud.io/terminal-user': username,
    'garden.sapcloud.io/terminal-target': target
  }
  if (targetClusterNamespace) {
    _.assign(annotation, { 'garden.sapcloud.io/terminal-target-cluster-ns': targetClusterNamespace })
  }
  return annotation
}

function toTerminalServiceAccountResource ({ prefix, name, saType, username, target, ownerReferences, labels = {}, annotations = {} }) {
  _.assign(annotations, getAnnotationTerminalUserAndTarget({ username, target }))
  _.assign(labels, { saType })

  const heartbeat = Math.floor(new Date() / 1000)
  const attachSaAnnotations = {
    'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
  }
  _.assign(annotations, attachSaAnnotations)

  return toServiceAccountResource({ prefix, name, labels, annotations, ownerReferences })
}

function toTerminalRoleBindingResource ({ name, saName, username, target, clusterRoleName, ownerReferences }) {
  const annotations = {}
  _.assign(annotations, getAnnotationTerminalUserAndTarget({ username, target }))

  const roleRef = {
    apiGroup: Resources.ClusterRole.apiGroup,
    kind: Resources.ClusterRole.kind,
    name: clusterRoleName
  }

  const subjects = [
    {
      kind: Resources.ServiceAccount.kind,
      name: saName
    }
  ]

  return toRoleBindingResource({ name, annotations, subjects, roleRef, ownerReferences })
}

function toTerminalClusterRoleBindingResource ({ name, saName, saNamespace, username, target, clusterRoleName, ownerReferences }) {
  const annotations = {}
  _.assign(annotations, getAnnotationTerminalUserAndTarget({ username, target }))

  const roleRef = {
    apiGroup: Resources.ClusterRole.apiGroup,
    kind: Resources.ClusterRole.kind,
    name: clusterRoleName
  }

  const subjects = [
    {
      kind: Resources.ServiceAccount.kind,
      name: saName,
      namespace: saNamespace
    }
  ]

  return toClusterRoleBindingResource({ name, roleRef, subjects, annotations, ownerReferences })
}

function toTerminalPodResource ({ name, username, target, targetClusterNamespace, terminalImage, ownerReferences, kubeconfigSecretName }) {
  const annotations = {}
  _.assign(annotations, getAnnotationTerminalUserAndTarget({ username, target, targetClusterNamespace }))

  const spec = {
    containers: [
      {
        name: TERMINAL_CONTAINER_NAME,
        image: terminalImage,
        stdin: true,
        tty: true,
        volumeMounts: [
          {
            name: 'kubeconfig',
            mountPath: '/mnt/.kube'
          }
        ],
        env: [
          {
            name: 'KUBECONFIG',
            value: '/mnt/.kube/config'
          }
        ]
      }
    ],
    volumes: [
      {
        name: 'kubeconfig',
        secret: {
          secretName: kubeconfigSecretName,
          items: [{
            key: 'kubeconfig',
            path: 'config'
          }]
        }
      }
    ]
  }
  return toPodResource({ name, annotations, spec, ownerReferences })
}

async function initializeSeedTerminalObject ({ user, seed, scheduleNamespace }) {
  const terminalInfo = {
    namespace: scheduleNamespace,
    container: TERMINAL_CONTAINER_NAME
  }

  const isSoil = _.get(seed, ['metadata', 'labels', 'garden.sapcloud.io/role']) === 'soil'
  let soilIngressDomain
  if (isSoil) {
    const soilSeed = seed
    const ingressDomain = _.get(soilSeed, 'spec.ingressDomain')
    soilIngressDomain = `garden.${ingressDomain}`
  } else {
    const seedShootResource = await readShoot({ user, namespace: 'garden', name: _.get(seed, 'metadata.name') })
    soilIngressDomain = await getShootIngressDomain(seedShootResource)
  }

  terminalInfo.server = `api.${soilIngressDomain}`
  return terminalInfo
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

async function findExistingTerminalPod ({ coreClient, scheduleNamespace, username, target, targetClusterNamespace }) {
  const qs = { labelSelector: `component=${COMPONENT_TERMINAL}` }
  const existingPods = await coreClient.ns(scheduleNamespace).pods.get({ qs })
  const existingPod = _.find(existingPods.items, item => item.metadata.annotations['garden.sapcloud.io/terminal-user'] === username && item.metadata.annotations['garden.sapcloud.io/terminal-target'] === target && item.metadata.annotations['garden.sapcloud.io/terminal-target-cluster-ns'] === targetClusterNamespace)
  return existingPod
}

async function findExistingTerminal ({ coreClient, scheduleNamespace, username, target, targetClusterNamespace }) {
  const existingPod = await findExistingTerminalPod({ coreClient, scheduleNamespace, username, target, targetClusterNamespace })
  const isRunningOrPending = pod => {
    const phase = _.get(pod, 'status.phase')
    return phase === 'Running' || phase === 'Pending'
  }
  if (!isRunningOrPending(existingPod)) {
    return undefined
  }

  const existingPodName = existingPod.metadata.name
  const attachServiceAccountResource = _.first(existingPod.metadata.ownerReferences)
  if (!attachServiceAccountResource) {
    return undefined
  }
  const pod = existingPodName
  const waitUntilReady = false // if the service account token is not there it is maybe in the process of beeing deleted -> handle as create new terminal
  const serviceAccountTokenObj = await readServiceAccountToken({ coreClient, namespace: scheduleNamespace, serviceAccountName: attachServiceAccountResource.name, waitUntilReady })
  const token = _.get(serviceAccountTokenObj, 'token')
  if (_.isEmpty(token)) {
    return undefined
  }

  logger.debug(`Found terminal session for user ${username}: ${existingPodName}`)
  const attachServiceAccount = attachServiceAccountResource.name
  return { pod, token, attachServiceAccount }
}

async function createAttachServiceAccountResource ({ coreClient, scheduleNamespace, target, username }) {
  const prefix = `terminal-attach-${target}-`

  return coreClient.ns(scheduleNamespace).serviceaccounts.post({ body: toTerminalServiceAccountResource({ prefix, username, target, saType: SaTypeEnum.attach }) })
}

async function createTerminalPod ({ coreClient, scheduleNamespace, targetClusterNamespace, identifier, username, target, terminalImage, ownerReferences, kubeconfigSecretName }) {
  const name = `terminal-${identifier}`
  const podResource = await coreClient.ns(scheduleNamespace).pods.post({ body: toTerminalPodResource({ name, username, target, targetClusterNamespace, terminalImage, ownerReferences, kubeconfigSecretName }) })
  return _.get(podResource, 'metadata.name')
}

exports.create = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required to create terminal')
  }

  const { clientConfig, scheduleNamespace, targetClusterNamespace, kubeconfigSecretName, seed } = await getContext({ user, namespace, name, target })

  const terminalInfo = await initializeSeedTerminalObject({ user, seed, scheduleNamespace })
  return getOrCreateTerminalSession({ clientConfig, terminalInfo, scheduleNamespace, targetClusterNamespace, username, target, kubeconfigSecretName })
}

async function getContext ({ user, namespace, name, target }) {
  let scheduleNamespace
  let kubeconfigSecretName
  let targetClusterNamespace
  let seedName
  if (target === 'garden') {
    seedName = getConfigValue({ path: 'terminal.gardenCluster.seed' })
    scheduleNamespace = getConfigValue({ path: 'terminal.gardenCluster.namespace' })
    kubeconfigSecretName = getConfigValue({ path: 'terminal.gardenCluster.virtualGardenKubeconfigName', required: false })
    targetClusterNamespace = namespace
  } else {
    const shootResource = await shoots.read({ user, namespace, name })
    const seedShootNS = getSeedShootNamespace(shootResource)
    scheduleNamespace = seedShootNS
    seedName = shootResource.spec.cloud.seed

    if (target === 'shoot') {
      kubeconfigSecretName = 'kubecfg'
      targetClusterNamespace = 'default'
    } else { // target cp
      targetClusterNamespace = seedShootNS
    }
  }

  const seed = _.find(getSeeds(), ['metadata.name', seedName])
  if (!seed) {
    throw new Error(`Could not find seed with name ${seedName}`)
  }

  const gardenCoreClient = Core(user)
  const seedKubeconfig = await getSeedKubeconfig({ coreClient: gardenCoreClient, seed })
  if (!seedKubeconfig) {
    throw new Error('could not fetch seed kubeconfig')
  }
  const clientConfig = kubernetes.fromKubeconfig(seedKubeconfig)

  return {
    clientConfig,
    scheduleNamespace,
    targetClusterNamespace,
    kubeconfigSecretName,
    seed
  }
}

async function getOrCreateTerminalSession ({ clientConfig, terminalInfo, scheduleNamespace, targetClusterNamespace, username, target, kubeconfigSecretName }) {
  const coreClient = kubernetes.core(clientConfig)

  const existingTerminal = await findExistingTerminal({ coreClient, scheduleNamespace, username, target, targetClusterNamespace })
  if (existingTerminal) {
    _.assign(terminalInfo, existingTerminal)
    return terminalInfo
  }

  logger.debug(`No running pod found for user ${username}. Creating new pod and required resources..`)

  const rbacClient = kubernetes.rbac(clientConfig)
  terminalInfo = createTerminalSession({ clientConfig, coreClient, rbacClient, kubeconfigSecretName, scheduleNamespace, targetClusterNamespace, target, username, terminalInfo })
  return terminalInfo
}

function getSeedShootNamespace (shoot) {
  const seedShootNS = _.get(shoot, 'status.technicalID')
  if (_.isEmpty(seedShootNS)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNS
}

async function createTerminalSession ({ clientConfig, coreClient, rbacClient, kubeconfigSecretName, scheduleNamespace, targetClusterNamespace, target, username, terminalInfo }) {
  let attachServiceAccountResource
  try {
    attachServiceAccountResource = await createAttachServiceAccountResource({ coreClient, scheduleNamespace, target, username })

    // all resources created below get the attach service account as owner ref
    const ownerReferences = createOwnerRefArrayForResource(attachServiceAccountResource)

    const attachServiceAccountName = _.get(attachServiceAccountResource, 'metadata.name')
    const identifier = identifierFromAttachServiceAccount(attachServiceAccountName)
    terminalInfo.attachServiceAccount = attachServiceAccountName

    // create rolebinding for attach-sa
    await rbacClient.ns(scheduleNamespace).rolebindings.post({ body: toTerminalRoleBindingResource({ name: attachServiceAccountName, saName: attachServiceAccountName, username, target, clusterRoleName: CLUSTER_ROLE_TERMINAL_ATTACH, ownerReferences }) })

    const terminalImage = getConfigValue({ path: 'terminal.operator.image' })

    if (_.isEmpty(kubeconfigSecretName)) {
      const server = clientConfig.url // TODO local service?
      kubeconfigSecretName = await createInClusterKubeconfig({ saCoreClient: coreClient, saRbacClient: rbacClient, kubecfgCoreClient: coreClient, serviceAccountNamespace: scheduleNamespace, username, target, saOwnerReferences: ownerReferences, kubecfgNamespace: scheduleNamespace, kubecfgOwnerReferences: ownerReferences, identifier, server })
    } else {
      const targetClusterClientConfig = await getTargetClusterClientConfig({ coreClient, namespace: scheduleNamespace, kubeconfigSecretName })
      const targetClusterCoreClient = kubernetes.core(targetClusterClientConfig)
      const targetClusterRbacClient = kubernetes.rbac(targetClusterClientConfig)
      const server = targetClusterClientConfig.url
      // maybe split in two methods
      kubeconfigSecretName = await createInClusterKubeconfig({ saCoreClient: targetClusterCoreClient, saRbacClient: targetClusterRbacClient, kubecfgCoreClient: coreClient, serviceAccountNamespace: targetClusterNamespace, username, target, saOwnerReferences: undefined, kubecfgNamespace: scheduleNamespace, kubecfgOwnerReferences: ownerReferences, identifier, server }) // as this is a different cluster we can't set the owner reference of the attach SA
    }

    const pod = await createTerminalPod({ coreClient, scheduleNamespace, targetClusterNamespace, identifier, username, target, terminalImage, ownerReferences, kubeconfigSecretName })

    const attachServiceAccountToken = await readServiceAccountToken({ coreClient, namespace: scheduleNamespace, serviceAccountName: attachServiceAccountName })

    _.assign(terminalInfo, { pod, token: attachServiceAccountToken.token })

    return terminalInfo
  } catch (e) {
    /* If something goes wrong during setting up kubernetes resources, we need to cleanup the serviceaccount (if created)
       This will also delete all other leftovers via the owener refs (cascade delete) */
    const name = _.get(attachServiceAccountResource, 'metadata.name', false)
    try {
      if (name) {
        logger.debug(`Something went wrong during creation of Kubernetes resources. Cleaning up ServiceAccount ${name}..`)
        await coreClient.ns(scheduleNamespace).serviceaccounts.delete({ name })
      }
    } catch (e) {
      logger.error(`Unable to cleanup ServiceAccount ${name}. This may result in leftovers that you need to cleanup manually`)
    }
    throw new Error(`Could not setup Kubernetes Resources for Terminal session. Error: ${e}`)
  }
}

function identifierFromAttachServiceAccount (attachServiceAccountName) {
  return _.replace(attachServiceAccountName, 'terminal-attach-', '')
}

function accessServiceAccountNameFromIdentifier (identifier) {
  return `terminal-${identifier}`
}

async function createInClusterKubeconfig ({ saCoreClient, saRbacClient, kubecfgCoreClient, serviceAccountNamespace, saOwnerReferences, username, target, kubecfgNamespace, kubecfgOwnerReferences, identifier, server }) {
  const serviceAccountName = accessServiceAccountNameFromIdentifier(identifier)

  const serviceAccountTokenObj = await createAdminServiceAccount({ coreClient: saCoreClient, rbacClient: saRbacClient, namespace: serviceAccountNamespace, serviceAccountName, username, target, ownerReferences: saOwnerReferences, identifier, server })

  const kubeconfigName = await createKubeconfig({ coreClient: kubecfgCoreClient, namespace: kubecfgNamespace, serviceAccountTokenObj, serviceAccountName, serviceAccountNamespace, target, username, server, ownerReferences: kubecfgOwnerReferences })
  return kubeconfigName
}

async function createAdminServiceAccount ({ coreClient, rbacClient, namespace, serviceAccountName, username, target, ownerReferences }) {
  const adminServiceAccountResource = await coreClient.ns(namespace).serviceaccounts.post({ body: toTerminalServiceAccountResource({ name: serviceAccountName, saType: SaTypeEnum.access, username, target, ownerReferences }) })

  const adminSaOwnerRefs = createOwnerRefArrayForResource(adminServiceAccountResource)

  // TODO do not use namespace-scoped resources as owner of cluster-scoped resources
  const clusterRoleName = 'cluster-admin'
  if (target === 'garden' || target === 'shoot') { // create cluster rolebinding for cluster-admin
    await rbacClient.clusterrolebindings.post({ body: toTerminalClusterRoleBindingResource({ name: serviceAccountName, saName: serviceAccountName, saNamespace: namespace, username, target, clusterRoleName, ownerReferences: adminSaOwnerRefs }) })
  } else { // create rolebinding for namespace cluster-admin
    await rbacClient.ns(namespace).rolebindings.post({ body: toTerminalRoleBindingResource({ name: serviceAccountName, saName: serviceAccountName, username, target, clusterRoleName, ownerReferences: adminSaOwnerRefs }) })
  }

  // wait until API token is written into service account before creating the pod
  const serviceAccountTokenObj = await readServiceAccountToken({ coreClient, namespace, serviceAccountName })
  if (!serviceAccountTokenObj) {
    throw new Error('No API token found for service account %s', serviceAccountName)
  }
  return serviceAccountTokenObj
}

exports.heartbeat = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required')
  }

  const { clientConfig, scheduleNamespace, targetClusterNamespace, kubeconfigSecretName } = await getContext({ user, namespace, name, target })
  const coreClient = kubernetes.core(clientConfig)

  const existingPod = await findExistingTerminalPod({ coreClient, scheduleNamespace, username, target, targetClusterNamespace })
  if (_.get(existingPod, 'status.phase') !== 'Running') {
    throw new Error(`Can't process heartbeat, cannot find running pod for ${namespace}/${name}`)
  }

  const attachServiceAccount = _.first(existingPod.metadata.ownerReferences)
  if (attachServiceAccount) {
    const attachServiceAccountName = attachServiceAccount.name

    const heartbeat = Math.floor(new Date() / 1000)

    replaceHeartbeatOnServiceAccount({ coreClient, namespace: scheduleNamespace, name: attachServiceAccountName, heartbeat })
    if (kubeconfigSecretName) { // heartbeat in virtual garden cluster
      const identifier = identifierFromAttachServiceAccount(attachServiceAccountName)
      const accessServiceAccountName = accessServiceAccountNameFromIdentifier(identifier)
      const targetClusterClientConfig = await getTargetClusterClientConfig({ coreClient, namespace: scheduleNamespace, kubeconfigSecretName })
      const targetClusterCoreClient = kubernetes.core(targetClusterClientConfig)
      replaceHeartbeatOnServiceAccount({ coreClient: targetClusterCoreClient, namespace, name: accessServiceAccountName, heartbeat })
    }
    return { heartbeat }
  }
}

async function replaceHeartbeatOnServiceAccount ({ coreClient, namespace, name, heartbeat }) {
  const annotations = {
    'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
  }
  try {
    await coreClient.ns(namespace).serviceaccounts.mergePatch({ name, body: { metadata: { annotations } } })
  } catch (e) {
    logger.error(`Could not update service account. Error: ${e}`)
    throw new Error(`Could not update service account`)
  }
}
