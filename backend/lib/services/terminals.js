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
const { decodeBase64, getSeedKubeconfigForShoot, getShootIngressDomain } = require('../utils')
const config = require('../config')
const authorization = require('./authorization')
const shoots = require('./shoots')
const { Forbidden } = require('../errors')
const logger = require('../logger')

function core () {
  return kubernetes.core()
}

function rbac () {
  return kubernetes.rbac()
}

function toTerminalServiceAccountResource ({ prefix, name, user, target, ownerReferences = [], labels = {}, annotations = {} }) {
  const apiVersion = Resources.ServiceAccount.apiVersion
  const kind = Resources.ServiceAccount.kind
  labels.component = 'dashboard-terminal'
  annotations['garden.sapcloud.io/terminal-user'] = user
  annotations['garden.sapcloud.io/terminal-target'] = target

  const metadata = { labels, annotations, ownerReferences }
  if (name) {
    metadata.name = name
  } else {
    metadata.generateName = prefix
  }

  return { apiVersion, kind, metadata }
}

function toTerminalRoleBindingResource ({ name, user, target, roleName, ownerReferences }) {
  const apiVersion = Resources.RoleBinding.apiVersion
  const kind = Resources.RoleBinding.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user,
    'garden.sapcloud.io/terminal-target': target
  }
  const metadata = { name, labels, annotations, ownerReferences }

  const roleRef = {
    apiGroup: Resources.ClusterRole.apiGroup,
    kind: Resources.ClusterRole.kind,
    name: roleName
  }

  const subjects = [
    {
      kind: Resources.ServiceAccount.kind,
      name
    }
  ]

  return { apiVersion, kind, metadata, roleRef, subjects }
}

function toTerminalClusterRoleBindingResource ({ name, user, targetNamespace, target, roleName, ownerReferences }) {
  const apiVersion = Resources.ClusterRoleBinding.apiVersion
  const kind = Resources.ClusterRoleBinding.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user,
    'garden.sapcloud.io/terminal-target': target
  }
  const metadata = { name, labels, annotations, ownerReferences }

  const roleRef = {
    apiGroup: Resources.ClusterRole.apiGroup,
    kind: Resources.ClusterRole.kind,
    name: roleName
  }

  const subjects = [
    {
      kind: Resources.ServiceAccount.kind,
      name,
      namespace: targetNamespace
    }
  ]

  return { apiVersion, kind, metadata, roleRef, subjects }
}

function toTerminalPodResource ({ name, saName, user, target, ownerReferences }) {
  const apiVersion = Resources.Pod.apiVersion
  const kind = Resources.Pod.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user,
    'garden.sapcloud.io/terminal-target': target
  }
  const metadata = { name, labels, annotations, ownerReferences }
  const spec = {
    serviceAccountName: saName,
    containers: [
      {
        name: 'terminal',
        image: 'psutter/toolbelt',
        stdin: true,
        tty: true
      }
    ]
  }
  return { apiVersion, kind, metadata, spec }
}

function toTerminalShootPodResource ({ name, user, target, ownerReferences }) {
  const apiVersion = Resources.Pod.apiVersion
  const kind = Resources.Pod.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user,
    'garden.sapcloud.io/terminal-target': target
  }
  const metadata = { name, labels, annotations, ownerReferences }
  const spec = {
    containers: [
      {
        name: 'terminal',
        image: 'psutter/toolbelt',
        stdin: true,
        tty: true,
        volumeMounts: [
          {
            name: 'shoot-kubeconfig',
            mountPath: '/mnt/.kube-shoot'
          }
        ],
        env: [
          {
            name: 'KUBECONFIG',
            value: '/mnt/.kube-shoot/kubeconfig.yaml'
          }
        ]
      }
    ],
    volumes: [
      {
        name: 'shoot-kubeconfig',
        secret: {
          secretName: 'kubecfg',
          items: [{
            key: 'kubeconfig',
            path: 'kubeconfig.yaml'
          }]
        }
      }
    ]
  }
  return { apiVersion, kind, metadata, spec }
}

async function readServiceAccountToken ({ client, targetNamespace, serviceaccountName }) {
  const watch = watchServiceAccount({ client, targetNamespace, serviceaccountName })
  const conditionFunction = isServiceAccountReady
  const resourceName = serviceaccountName
  const serviceAccount = await kubernetes.waitUntilResourceHasCondition({ watch, conditionFunction, resourceName, initializationTimeout: 10 * 1000 })
  const secretName = await _.get(_.first(serviceAccount.secrets), 'name')
  if (secretName && secretName.length > 0) {
    const secret = await client.ns(targetNamespace).secrets.get({ name: secretName })
    const token = decodeBase64(secret.data.token)
    const caData = secret.data['ca.crt']
    return { token, caData }
  }
}

function isServiceAccountReady ({ secrets } = {}) {
  const secretName = _.get(_.first(secrets), 'name')
  return (secretName && secretName.length > 0)
}

function watchServiceAccount ({ client, targetNamespace, serviceaccountName }) {
  return client.ns(targetNamespace).serviceaccounts.watch({ name: serviceaccountName })
}

async function getRequiredResourcesAndClients ({ user, namespace, name }) {
  // get seed and seed kubeconfig for shoot
  const shootResource = await shoots.read({ user, namespace, name })
  const seedKubeconfigForShoot = await getSeedKubeconfigForShoot({ user, shoot: shootResource })
  if (!seedKubeconfigForShoot) {
    throw new Error('could not fetch seed kubeconfig for shoot')
  }
  const { seed, seedKubeconfig, seedShootNS } = seedKubeconfigForShoot

  const fromSeedKubeconfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedK8sCoreClient = kubernetes.core(fromSeedKubeconfig)
  const seedK8sRbacClient = kubernetes.rbac(fromSeedKubeconfig)

  return { seed, seedShootNS, seedK8sCoreClient, seedK8sRbacClient }
}

async function initializeGardenTerminalObject ({ namespace }) {
  const terminalInfo = {}
  terminalInfo.namespace = namespace
  terminalInfo.container = 'terminal'

  const apiServerUrl = _.get(config, 'apiServerUrl')
  if (!apiServerUrl) {
    throw new Error('no apiServerUrl config found')
  }
  terminalInfo.server = new URL(apiServerUrl).hostname
  return terminalInfo
}

async function initializeSeedTerminalObject ({ user, namespace, seed, seedShootNS }) {
  const terminalInfo = {}
  terminalInfo.namespace = seedShootNS
  terminalInfo.container = 'terminal'

  let soilIngressDomain
  if (namespace === 'garden') {
    const soilSeed = seed
    const ingressDomain = _.get(soilSeed, 'spec.ingressDomain')
    soilIngressDomain = `${namespace}.${ingressDomain}`
  } else {
    const seedShootResource = await shoots.read({ user, namespace: 'garden', name: _.get(seed, 'metadata.name') })
    soilIngressDomain = await getShootIngressDomain(seedShootResource)
  }

  terminalInfo.server = `api.${soilIngressDomain}`
  return terminalInfo
}

async function findExistingTerminalPod ({ coreClient, targetNamespace, username, target }) {
  const qs = { labelSelector: 'component=dashboard-terminal' }
  const existingPods = await coreClient.ns(targetNamespace).pods.get({ qs })
  const existingPod = _.find(existingPods.items, item => item.metadata.annotations['garden.sapcloud.io/terminal-user'] === username && item.metadata.annotations['garden.sapcloud.io/terminal-target'] === target)
  return existingPod
}

async function findExistingTerminal ({ coreClient, targetNamespace, username, target }) {
  const existingPod = await findExistingTerminalPod({ coreClient, targetNamespace, username, target })
  if (existingPod && _.get(existingPod, 'status.phase') === 'Running') {
    const existingPodName = existingPod.metadata.name
    const attachServiceAccountResource = _.first(existingPod.metadata.ownerReferences)
    if (attachServiceAccountResource) {
      logger.debug(`Found running Pod for User ${username}: ${existingPodName}. Re-using Pod for terminal session..`)
      const pod = existingPodName
      const { token } = await readServiceAccountToken({ client: coreClient, targetNamespace, serviceaccountName: attachServiceAccountResource.name })
      const attachServiceAccount = attachServiceAccountResource.name
      return { pod, token, attachServiceAccount }
    }
  }
  return undefined
}

async function createAttachServiceAccountResource ({ coreClient, targetNamespace, target, username }) {
  const attachSaLabels = {
    satype: 'attach'
  }
  const heartbeat = Math.floor(new Date() / 1000)
  const attachSaAnnotations = {
    'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
  }
  const prefix = `terminal-attach-${target}-`
  const user = username
  const labels = attachSaLabels
  const annotations = attachSaAnnotations

  return coreClient.ns(targetNamespace).serviceaccounts.post({ body: toTerminalServiceAccountResource({ prefix, user, target, labels, annotations }) })
}

function createOwnerRefArrayForAttachSA (attachServiceAccountResource) {
  const attachServiceAccountName = _.get(attachServiceAccountResource, 'metadata.name')
  const uid = _.get(attachServiceAccountResource, 'metadata.uid')
  return [
    {
      apiVersion: attachServiceAccountResource.apiVersion,
      controller: true,
      kind: attachServiceAccountResource.kind,
      name: attachServiceAccountName,
      uid
    }
  ]
}

async function createPodForTerminal ({ coreClient, rbacClient, targetNamespace, identifier, user, target, ownerReferences }) {
  // create service account used by terminal pod for control plane access
  const adminServiceAccountName = `terminal-${identifier}`
  await coreClient.ns(targetNamespace).serviceaccounts.post({ body: toTerminalServiceAccountResource({ name: adminServiceAccountName, user, target, ownerReferences }) })

  // create rolebinding for namespace admin
  if (target === 'garden') {
    await rbacClient.clusterrolebindings.post({ body: toTerminalClusterRoleBindingResource({ name: adminServiceAccountName, targetNamespace, user, target, roleName: 'cluster-admin', ownerReferences }) })
  } else {
    await rbacClient.ns(targetNamespace).rolebindings.post({ body: toTerminalRoleBindingResource({ name: adminServiceAccountName, user, target, roleName: 'admin', ownerReferences }) })
  }

  // wait until API token is written into service account before creating the pod
  if (!await readServiceAccountToken({ client: coreClient, targetNamespace, serviceaccountName: adminServiceAccountName })) {
    throw new Error('No API token found for service account %s', adminServiceAccountName)
  }

  // create pod
  const name = `terminal-${identifier}`
  const podResource = await coreClient.ns(targetNamespace).pods.post({ body: toTerminalPodResource({ name, saName: adminServiceAccountName, user, target, ownerReferences }) })
  return _.get(podResource, 'metadata.name')
}

async function createPodForShootTerminal ({ coreClient, targetNamespace, identifier, user, target, ownerReferences }) {
  // create pod
  const name = `terminal-${identifier}`
  const podResource = await coreClient.ns(targetNamespace).pods.post({ body: toTerminalShootPodResource({ name, user, target, ownerReferences }) })
  return _.get(podResource, 'metadata.name')
}

exports.create = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required to create terminal')
  }

  let coreClient
  let rbacClient
  let terminalInfo
  let targetNamespace
  if (target === 'garden') {
    terminalInfo = await initializeGardenTerminalObject({ namespace })
    coreClient = core()
    rbacClient = rbac()
    targetNamespace = namespace
  } else {
    const { seed, seedShootNS, seedK8sCoreClient, seedK8sRbacClient } = await getRequiredResourcesAndClients({ user, namespace, name })
    terminalInfo = await initializeSeedTerminalObject({ user, namespace, seed, seedShootNS })
    coreClient = seedK8sCoreClient
    rbacClient = seedK8sRbacClient
    targetNamespace = seedShootNS
  }

  const existingTerminal = await findExistingTerminal({ coreClient, targetNamespace, username, target })
  if (existingTerminal) {
    _.assign(terminalInfo, existingTerminal)
    return terminalInfo
  }

  logger.debug(`No running Pod found for user ${username}. Creating new Pod and required Resources..`)

  let attachServiceAccountResource
  try {
    attachServiceAccountResource = await createAttachServiceAccountResource({ coreClient, targetNamespace, target, username })

    // all resources created below get the attach service account as owner ref
    const ownerReferences = createOwnerRefArrayForAttachSA(attachServiceAccountResource)

    const attachServiceAccountName = _.get(attachServiceAccountResource, 'metadata.name')
    const identifier = _.replace(attachServiceAccountName, 'terminal-attach-', '')

    terminalInfo.attachServiceAccount = attachServiceAccountName

    // create rolebinding for attach-sa
    await rbacClient.ns(targetNamespace).rolebindings.post({ body: toTerminalRoleBindingResource({ name: attachServiceAccountName, user: username, target, roleName: 'garden.sapcloud.io:dashboard-terminal-attach', ownerReferences }) })

    let pod
    if (target === 'cp' || target === 'garden') {
      pod = await createPodForTerminal({ coreClient, rbacClient, targetNamespace, identifier, user: username, target, ownerReferences })
    } else if (target === 'shoot') {
      pod = await createPodForShootTerminal({ coreClient, targetNamespace, identifier, user: username, target, ownerReferences })
    } else {
      throw new Error(`Unknown terminal target ${target}`)
    }
    const attachServiceAccountToken = await readServiceAccountToken({ client: coreClient, targetNamespace, serviceaccountName: attachServiceAccountName })

    _.assign(terminalInfo, { pod }, { token: attachServiceAccountToken.token })

    return terminalInfo
  } catch (e) {
    /* If something goes wrong during setting up kubernetes resources, we need to cleanup the serviceaccount (if created)
       This will also delete all other leftovers via the owener refs (cascade delete) */
    const name = _.get(attachServiceAccountResource, 'metadata.name', false)
    try {
      if (name) {
        logger.debug(`Something went wrong during creation of Kubernetes resources. Cleaning up ServiceAccount ${name}..`)
        await coreClient.ns(targetNamespace).serviceaccounts.delete({ name })
      }
    } catch (e) {
      logger.error(`Unable to cleanup ServiceAccount ${name}. This may result in leftovers that you need to cleanup manually`)
    }
    throw new Error(`Could not setup Kubernetes Resources for Terminal session. Error: ${e}`)
  }
}

exports.heartbeat = async function ({ user, namespace, name, target }) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required')
  }

  let coreClient
  let targetNamespace
  if (target === 'garden') {
    coreClient = core()
    targetNamespace = namespace
  } else {
    // get seed and seed kubeconfig for shoot
    const shootResource = await shoots.read({ user, namespace, name })
    const { seedKubeconfig, seedShootNS } = await getSeedKubeconfigForShoot({ user, shoot: shootResource })
    coreClient = kubernetes.core(kubernetes.fromKubeconfig(seedKubeconfig))
    targetNamespace = seedShootNS
  }

  const existingPod = await findExistingTerminalPod({ coreClient, targetNamespace, username, target })
  if (existingPod && _.get(existingPod, 'status.phase') === 'Running') {
    const attachServiceAccount = _.first(existingPod.metadata.ownerReferences)
    if (attachServiceAccount) {
      const attachServiceAccountName = attachServiceAccount.name

      const heartbeat = Math.floor(new Date() / 1000)
      const attachSaAnnotations = {
        'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
      }
      try {
        await coreClient.ns(targetNamespace).serviceaccounts.mergePatch({ name: attachServiceAccountName, body: { metadata: { annotations: attachSaAnnotations } } })
        return { heartbeat }
      } catch (e) {
        logger.error(`Could not update service account. Error: ${e}`)
        throw new Error(`Could not update service account`)
      }
    }
  }
  throw new Error(`Could not determine service account for ${namespace}/${name}`)
}
