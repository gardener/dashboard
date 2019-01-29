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

const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources
const { decodeBase64, encodeBase64, getSeedKubeconfigForShoot, getShootIngressDomain } = require('../utils')

const authorization = require('./authorization')
const shoots = require('./shoots')
const { Forbidden } = require('../errors')
const _ = require('lodash')
const yaml = require('js-yaml')
const logger = require('../logger')

function toTerminalServiceAccountResource ({prefix, name, user, ownerReferences = [], labels = {}, annotations = {}}) {
  const apiVersion = Resources.ServiceAccount.apiVersion
  const kind = Resources.ServiceAccount.kind
  labels.component = 'dashboard-terminal'
  annotations['garden.sapcloud.io/terminal-user'] = user

  const metadata = {labels, annotations, ownerReferences}
  if (name) {
    metadata.name = name
  } else {
    metadata.generateName = prefix
  }

  return {apiVersion, kind, metadata}
}

function toTerminalRoleBindingResource ({name, user, roleName, ownerReferences}) {
  const apiVersion = Resources.RoleBinding.apiVersion
  const kind = Resources.RoleBinding.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user
  }
  const metadata = {name, labels, annotations, ownerReferences}

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

  return {apiVersion, kind, metadata, roleRef, subjects}
}

function toSecretResource ({name, user, ownerReferences, data}) {
  const apiVersion = Resources.Secret.apiVersion
  const kind = Resources.Secret.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user
  }
  const metadata = {name, labels, annotations, ownerReferences}
  const type = 'Opaque'

  return {apiVersion, kind, metadata, type, data}
}

function toTerminalPodResource ({name, cpSecretName, user, ownerReferences}) {
  const apiVersion = Resources.Pod.apiVersion
  const kind = Resources.Pod.kind
  const labels = {
    component: 'dashboard-terminal'
  }
  const annotations = {
    'garden.sapcloud.io/terminal-user': user
  }
  const metadata = {name, labels, annotations, ownerReferences}
  const spec = {
    containers: [
      {
        name: 'terminal',
        image: 'eu.gcr.io/gardener-project/gardener/ops-toolbelt',
        // image: 'astefanutti/kubebox',
        stdin: true,
        tty: true,
        volumeMounts: [
          {
            name: 'shoot-kubeconfig',
            mountPath: '/tmp/.kube-shoot'
          },
          {
            name: 'cp-kubeconfig',
            mountPath: '/tmp/.kube-cp'
          }
        ],
        env: [
          {
            name: 'KUBECONFIG',
            value: '/tmp/.kube-cp/cp-kubeconfig.yaml'
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
            path: 'shoot-kubeconfig.yaml'
          }]
        }
      },
      {
        name: 'cp-kubeconfig',
        secret: {
          secretName: cpSecretName,
          items: [{
            key: 'kubeconfig',
            path: 'cp-kubeconfig.yaml'
          }]
        }
      }
    ]
  }
  return {apiVersion, kind, metadata, spec}
}

async function readServiceAccountToken ({client, serviceaccountName}) {
  const watch = watchServiceAccount({client, serviceaccountName})
  const conditionFunction = isServiceAccountReady
  const resourceName = serviceaccountName
  const serviceAccount = await kubernetes.waitUntilResourceHasCondition({watch, conditionFunction, resourceName})
  const secretName = await _.get(_.first(serviceAccount.secrets), 'name')
  if (secretName && secretName.length > 0) {
    const secret = await client.secrets.get({name: secretName})
    const token = decodeBase64(secret.data.token)
    const caData = secret.data['ca.crt']
    return { token, caData }
  }
}

function isServiceAccountReady ({secrets} = {}) {
  const secretName = _.get(_.first(secrets), 'name')
  return (secretName && secretName.length > 0)
}

function watchServiceAccount ({client, serviceaccountName}) {
  return client.serviceaccounts.watch({name: serviceaccountName})
}

exports.create = async function ({user, namespace, name}) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required to create terminal')
  }
  // get seed and seed kubeconfig for shoot
  const shootResource = await shoots.read({user, namespace, name})
  const seedKubeconfigForShoot = await getSeedKubeconfigForShoot({ user, shoot: shootResource })
  if (!seedKubeconfigForShoot) {
    throw new Error('could not fetch seed kubeconfig for shoot')
  }
  const { seed, seedKubeconfig, seedShootNS } = seedKubeconfigForShoot

  const terminalInfo = {}
  terminalInfo.namespace = seedShootNS
  terminalInfo.container = 'terminal'

  let soilIngressDomain
  if (namespace === 'garden') {
    const soilSeed = seed
    const ingressDomain = _.get(soilSeed, 'spec.ingressDomain')
    soilIngressDomain = `${namespace}.${ingressDomain}`
  } else {
    const seedShootResource = await shoots.read({user, namespace: 'garden', name: _.get(seed, 'metadata.name')})
    soilIngressDomain = await getShootIngressDomain(seedShootResource)
  }
  terminalInfo.server = `api.${soilIngressDomain}`

  const seedKubeconfigJson = yaml.safeLoad(seedKubeconfig)
  const seedAPIServer = _.get(_.head(_.get(seedKubeconfigJson, 'clusters')), 'cluster.server')

  const fromSeedKubeconfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedK8sCoreClient = kubernetes.core(fromSeedKubeconfig).ns(seedShootNS)
  const seedK8sRbacClient = kubernetes.rbac(fromSeedKubeconfig).ns(seedShootNS)
  const qs = { labelSelector: 'component=dashboard-terminal' }
  const existingPods = await seedK8sCoreClient.pods.get({qs})
  const existingPodForUser = _.find(existingPods.items, item => item.metadata.annotations['garden.sapcloud.io/terminal-user'] === username)
  if (existingPodForUser && _.get(existingPodForUser, 'status.phase') === 'Running') {
    const existingPodName = existingPodForUser.metadata.name
    const attachServiceAccount = _.first(existingPodForUser.metadata.ownerReferences)
    if (attachServiceAccount) {
      logger.debug(`Found running Pod for User ${username}: ${existingPodName}. Re-using Pod for terminal session..`)
      terminalInfo.pod = existingPodName
      const {token} = await readServiceAccountToken({client: seedK8sCoreClient, serviceaccountName: attachServiceAccount.name})
      terminalInfo.attachServiceAccount = attachServiceAccount.name
      terminalInfo.token = token
      return terminalInfo
    }
  }

  logger.debug(`No running Pod found for user ${username}. Creating new Pod and required Resources..`)

  let attachServiceAccountResource
  try {
    // create attach serviceaccount
    const attachSaLabels = {
      satype: 'attach'
    }
    const heartbeat = Math.floor(new Date() / 1000)
    const attachSaAnnotations = {
      'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
    }
    attachServiceAccountResource = await seedK8sCoreClient.serviceaccounts.post({body: toTerminalServiceAccountResource({prefix: 'terminal-attach-', user: username, labels: attachSaLabels, annotations: attachSaAnnotations})})

    // create owner ref object, attach-serviceaccount gets owner of all resources created below
    const attachServiceAccountName = _.get(attachServiceAccountResource, 'metadata.name')
    const identifier = _.replace(attachServiceAccountName, 'terminal-attach-', '')
    const uid = _.get(attachServiceAccountResource, 'metadata.uid')
    const ownerReferences = [
      {
        apiVersion: attachServiceAccountResource.apiVersion,
        controller: true,
        kind: attachServiceAccountResource.kind,
        name: attachServiceAccountName,
        uid
      }
    ]
    terminalInfo.attachServiceAccount = attachServiceAccountName

    // create rolebinding for attach-sa
    await seedK8sRbacClient.rolebindings.post({body: toTerminalRoleBindingResource({name: attachServiceAccountName, user: username, roleName: 'garden.sapcloud.io:dashboard-terminal-attach', ownerReferences})})

    // create service account used by terminal pod for control plane access
    const cpServiceAccountName = `terminal-cp-${identifier}`
    await seedK8sCoreClient.serviceaccounts.post({body: toTerminalServiceAccountResource({name: cpServiceAccountName, user: username, ownerReferences})})

    // create rolebinding for cpaccess-sa
    await seedK8sRbacClient.rolebindings.post({body: toTerminalRoleBindingResource({name: cpServiceAccountName, user: username, roleName: 'garden.sapcloud.io:dashboard-terminal-cpaccess', ownerReferences})})

    // create kubeconfig for cpaccess-sa and store as secret
    const {token, caData} = await readServiceAccountToken({client: seedK8sCoreClient, serviceaccountName: cpServiceAccountName})
    const contextName = `controlplane-${seedShootNS}`
    const kubeconfig = encodeBase64(kubernetes.getKubeconfigFromServiceAccount({serviceaccountName: cpServiceAccountName, contextName, serviceaccountNamespace: seedShootNS, token, server: seedAPIServer, caData}))
    await seedK8sCoreClient.secrets.post({body: toSecretResource({name: cpServiceAccountName, user: username, ownerReferences, data: {kubeconfig}})})

    // create pod
    const name = `terminal-${identifier}`
    const podResource = await seedK8sCoreClient.pods.post({body: toTerminalPodResource({name, cpSecretName: cpServiceAccountName, user: username, ownerReferences})})
    const attachServiceAccountToken = await readServiceAccountToken({client: seedK8sCoreClient, serviceaccountName: attachServiceAccountName})
    terminalInfo.pod = _.get(podResource, 'metadata.name')
    terminalInfo.token = _.get(attachServiceAccountToken, 'token')

    return terminalInfo
  } catch (e) {
    /* If something goes wrong during setting up kubernetes resources, we need to cleanup the serviceaccount (if created)
       This will also delete all other leftovers via the owener refs (cascade delete) */
    const name = _.get(attachServiceAccountResource, 'metadata.name', false)
    try {
      if (name) {
        logger.debug(`Something went wrong during creation of Kubernetes resources. Cleaning up ServiceAccount ${name}..`)
        await seedK8sCoreClient.serviceaccounts.delete({name})
      }
    } catch (e) {
      logger.error(`Unable to cleanup ServiceAccount ${name}. This may result in leftovers that you need to cleanup manually`)
    }
    throw new Error(`Could not setup Kubernetes Resources for Terminal session. Error: ${e}`)
  }
}

exports.heartbeat = async function ({user, namespace, name}) {
  const isAdmin = await authorization.isAdmin(user)
  const username = user.id

  if (!isAdmin) {
    throw new Forbidden('Admin privileges required')
  }
  // get seed and seed kubeconfig for shoot
  const shootResource = await shoots.read({user, namespace, name})
  const { seedKubeconfig, seedShootNS } = await getSeedKubeconfigForShoot({ user, shoot: shootResource })

  const seedK8sCoreClient = kubernetes.core(kubernetes.fromKubeconfig(seedKubeconfig)).ns(seedShootNS)
  const qs = { labelSelector: 'component=dashboard-terminal' }
  const existingPods = await seedK8sCoreClient.pods.get({qs})
  const existingPodForUser = _.find(existingPods.items, item => item.metadata.annotations['garden.sapcloud.io/terminal-user'] === username)
  if (existingPodForUser && _.get(existingPodForUser, 'status.phase') === 'Running') {
    const attachServiceAccount = _.first(existingPodForUser.metadata.ownerReferences)
    if (attachServiceAccount) {
      const attachServiceAccountName = attachServiceAccount.name

      const heartbeat = Math.floor(new Date() / 1000)
      const attachSaAnnotations = {
        'garden.sapcloud.io/terminal-heartbeat': `${heartbeat}`
      }
      try {
        await seedK8sCoreClient.serviceaccounts.mergePatch({ name: attachServiceAccountName, body: { metadata: { annotations: attachSaAnnotations } } })
        return { heartbeat }
      } catch (e) {
        logger.error(`Could not update service account. Error: ${e}`)
        throw new Error(`Could not update service account`)
      }
    }
  }
  throw new Error(`Could not determine service account for ${namespace}/${name}`)
}
