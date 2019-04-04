
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
const Queue = require('better-queue')
const isIp = require('is-ip')
const _ = require('lodash')

const logger = require('../../logger')
const config = require('../../config')
const {
  getSeedKubeconfig,
  getShootIngressDomainForSeed,
  getSoilIngressDomainForSeed,
  createOwnerRefArrayForResource,
  getConfigValue,
  readServiceAccountToken,
  getTargetClusterClientConfig
} = require('..')
const kubernetes = require('../../kubernetes')
const Resources = kubernetes.Resources
const {
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource,
  toIngressResource,
  toEndpointResource,
  toServiceResource
} = require('./terminalResources')
const shoots = require('../../services/shoots')
const {
  CLUSTER_ROLE_TERMINAL_ATTACH,
  replaceResource,
  createKubeconfig,
  SaTypeEnum
} = require('../terminals')

const TERMINAL_CLEANUP = 'dashboard-terminal-cleanup'
const TERMINAL_CLEANUP_GARDEN = 'dashboard-terminal-cleanup-garden'
const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

const GARDEN_NAMESPACE = 'garden'
const CLUSTER_ROLE_NAME_CLEANUP = 'garden.sapcloud.io:dashboard-terminal-cleanup'
const CLUSTER_ROLE_BINDING_NAME_CLEANUP = 'garden.sapcloud.io:dashboard-terminal-cleanup'
const CLUSTER_ROLE_BINDING_NAME_CLEANUP_GARDEN = 'garden.sapcloud.io:dashboard-terminal-cleanup-garden'

async function replaceClusterroleAttach ({ rbacClient, ownerReferences }) {
  const name = CLUSTER_ROLE_TERMINAL_ATTACH
  const rules = [
    {
      apiGroups: [
        ''
      ],
      resources: [
        'pods/attach'
      ],
      verbs: [
        'get'
      ]
    },
    {
      apiGroups: [
        ''
      ],
      resources: [
        'pods'
      ],
      verbs: [
        'watch'
      ]
    }
  ]

  const body = toClusterRoleResource({ name, rules, ownerReferences })
  const client = rbacClient.clusterrole

  return replaceResource({ client, name, body })
}

async function replaceClusterroleCleanup ({ rbacClient, ownerReferences }) {
  const name = CLUSTER_ROLE_NAME_CLEANUP
  const rules = [
    {
      apiGroups: [
        ''
      ],
      resources: [
        'serviceaccounts'
      ],
      verbs: [
        'list',
        'delete'
      ]
    }
  ]

  const body = toClusterRoleResource({ name, rules, ownerReferences })
  const client = rbacClient.clusterrole

  return replaceResource({ client, name, body })
}

async function replaceClusterroleBindingCleanup ({ rbacClient, name, saName, saNamespace, ownerReferences }) {
  const clusterRoleName = CLUSTER_ROLE_NAME_CLEANUP

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

  const body = toClusterRoleBindingResource({ name, roleRef, subjects, ownerReferences })
  const client = rbacClient.clusterrolebinding

  return replaceResource({ client, name, body })
}

async function replaceServiceAccountCleanup ({ coreClient, name, namespace, ownerReferences }) {
  const body = toServiceAccountResource({ name, ownerReferences })
  const client = coreClient.ns(namespace).serviceaccounts

  return replaceResource({ client, name, body })
}

async function replaceCronJobCleanup ({ batchClient, name, namespace, kubeconfigSecretName, saType, ownerReferences }) {
  const image = _.get(config, 'terminal.cleanup.image')
  const noHeartbeatDeleteSeconds = String(_.get(config, 'terminal.cleanup.noHeartbeatDeleteSeconds', 300))
  const schedule = _.get(config, 'terminal.cleanup.schedule', '*/5 * * * *')

  const securityContext = {
    runAsUser: 1000,
    runAsNonRoot: true,
    readOnlyRootFilesystem: true
  }

  const cleanupContainer = {
    name: TERMINAL_CLEANUP,
    image,
    imagePullPolicy: 'IfNotPresent',
    env: [
      {
        name: 'NO_HEARTBEAT_DELETE_SECONDS',
        value: noHeartbeatDeleteSeconds
      }
    ]
    // TODO limit resources
  }

  const podSpec = {
    containers: [
      cleanupContainer
    ],
    securityContext,
    restartPolicy: 'OnFailure'
  }

  const spec = {
    concurrencyPolicy: 'Forbid',
    schedule,
    jobTemplate: {
      spec: {
        template: {
          spec: podSpec
        }
      }
    }
  }

  _.assign(cleanupContainer, {
    volumeMounts: [
      {
        name: 'kubeconfig',
        mountPath: `/config/${saType}`
      }
    ]
  })
  _.assign(podSpec, {
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
  })

  const body = toCronjobResource({ name, spec, ownerReferences })
  const client = batchClient.ns(namespace).cronjob

  // TODO revive dead cronjob by deleting and recreating it as there is currently no other way to resume it https://github.com/kubernetes/kubernetes/issues/42649
  return replaceResource({ client, name, body })
}

async function replaceIngressApiServer ({ name = TERMINAL_KUBE_APISERVER, extensionClient, namespace, host, serviceName, ownerReferences }) {
  const annotations = _.get(config, 'terminal.bootstrap.apiserverIngress.annotations')

  const spec = {
    rules: [
      {
        host,
        http: {
          paths: [
            {
              backend: {
                serviceName,
                servicePort: 443
              },
              path: '/'
            }
          ]
        }
      }
    ],
    tls: [
      {
        hosts: [
          host
        ],
        secretName: `${name}-tls`
      }
    ]
  }

  const body = toIngressResource({ name, annotations, spec, ownerReferences })
  const client = extensionClient.ns(namespace).ingress

  return replaceResource({ client, name, body })
}

async function replaceEndpointKubeApiserver ({ name = TERMINAL_KUBE_APISERVER, coreClient, namespace, ip, ownerReferences }) {
  // TODO label role: apiserver ?
  const subsets = [
    {
      addresses: [
        {
          ip
        }
      ],
      ports: [
        {
          port: 443,
          protocol: 'TCP'
        }
      ]
    }
  ]

  const body = toEndpointResource({ name, namespace, subsets, ownerReferences })
  const client = coreClient.ns(namespace).endpoints

  return replaceResource({ client, name, body })
}

async function replaceServiceKubeApiserver ({ name = TERMINAL_KUBE_APISERVER, coreClient, namespace, externalName = undefined, ownerReferences }) {
  let type
  if (externalName) {
    type = 'ExternalName'
  }

  // TODO label role: apiserver ?
  const spec = {
    ports: [
      {
        port: 443,
        protocol: 'TCP',
        targetPort: 443
      }
    ],
    type, // optional
    externalName // optional
  }

  const body = toServiceResource({ name, namespace, spec, ownerReferences })
  const client = coreClient.ns(namespace).services

  return replaceResource({ client, name, body })
}

async function handleSeed (seed, cb) {
  const name = seed.metadata.name
  logger.debug(`replacing resources on seed ${name} for webterminals`)
  const coreClient = kubernetes.core()
  const gardenClient = kubernetes.garden()
  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed })
  if (!seedKubeconfig) {
    throw new Error(`could not get kubeconfig for seed ${name}`)
  }
  const seedClientConfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedCoreClient = kubernetes.core(seedClientConfig)
  const seedRbacClient = kubernetes.rbac(seedClientConfig)
  const seedBatchClient = kubernetes.batch(seedClientConfig)

  const namespace = GARDEN_NAMESPACE

  // create cleanup resources
  const kubeconfigSecretName = await createCleanupKubeconfig({ saClientConfig: seedClientConfig, saCoreClient: seedCoreClient, saRbacClient: seedRbacClient, kubecfgCoreClient: seedCoreClient, name: TERMINAL_CLEANUP, namespace, clusterRolebindingName: CLUSTER_ROLE_BINDING_NAME_CLEANUP })
  await replaceCronJobCleanup({ batchClient: seedBatchClient, name: TERMINAL_CLEANUP, namespace, kubeconfigSecretName, saType: SaTypeEnum.attach }) // TODO ownerReference

  await bootstrapAttachResources({ rbacClient: seedRbacClient }) // TODO ownerReferences

  // now make sure we expose the kube-apiserver with a browser-trusted certificate
  const isSoil = _.get(seed, ['metadata', 'labels', 'garden.sapcloud.io/role']) === 'soil'
  if (isSoil) {
    const soilSeedResource = seed
    await bootstrapIngressAndHeadlessServiceForSoilOnSoil({ coreClient, soilSeedResource })
  } else {
    await bootstrapIngressForSeedOnSoil({ gardenClient, coreClient, seedName: name })
  }
}

async function createCleanupKubeconfig ({ saClientConfig, saCoreClient, saRbacClient, kubecfgCoreClient, name, namespace, clusterRolebindingName }) {
  const clusterRoleResource = await replaceClusterroleCleanup({ rbacClient: saRbacClient })
  const ownerReferences = createOwnerRefArrayForResource(clusterRoleResource)
  const { metadata: { name: saName, namespace: saNamespace } } = await replaceServiceAccountCleanup({ coreClient: saCoreClient, name, namespace, ownerReferences })
  await replaceClusterroleBindingCleanup({ rbacClient: saRbacClient, name: clusterRolebindingName, saName, saNamespace, ownerReferences })

  // TODO get rid of the watch closed 1006 log messages
  // wait until API token is written into service account before creating the pod
  const serviceAccountTokenObj = await readServiceAccountToken({ coreClient: saCoreClient, namespace, serviceAccountName: saName })
  if (!serviceAccountTokenObj) {
    throw new Error('No API token found for service account %s', saName)
  }
  const server = saClientConfig.url
  const kubeconfigName = await createKubeconfig({ coreClient: kubecfgCoreClient, namespace, serviceAccountTokenObj, serviceAccountName: saName, contextNamespace: saNamespace, target: 'cleanup', server }) // TODO owner reference! pass only if on same cluster as where the secret was created!
  return kubeconfigName
}

async function bootstrapAttachResources ({ rbacClient, ownerReferences }) {
  return replaceClusterroleAttach({ rbacClient, ownerReferences })
}

async function bootstrapIngressForSeedOnSoil ({ gardenClient, coreClient, seedName }) {
  const seedShootResource = await shoots.read({ gardenClient, namespace: 'garden', name: seedName })

  // fetch soil's seed resource
  const soilName = seedShootResource.spec.cloud.seed
  const soilSeedResource = await gardenClient.seeds.get({ name: soilName })

  // get soil client
  const soilKubeconfig = await getSeedKubeconfig({ coreClient, seed: soilSeedResource })
  const soilClientConfig = kubernetes.fromKubeconfig(soilKubeconfig)
  const soilExtensionClient = kubernetes.extensions(soilClientConfig)

  // calculate ingress domain
  const soilIngressDomain = await getShootIngressDomainForSeed(seedShootResource, soilSeedResource)
  const apiserverIngressHost = `api.${soilIngressDomain}`

  // replace ingress apiserver resource
  const seedShootNS = _.get(seedShootResource, 'status.technicalID')
  if (!seedShootNS) {
    throw new Error(`could not get namespace for seed ${seedName} on soil`)
  }

  const serviceName = 'kube-apiserver'
  await replaceIngressApiServer({
    extensionClient: soilExtensionClient,
    namespace: seedShootNS,
    serviceName,
    host: apiserverIngressHost
  }) // TODO owner reference ?
}

async function bootstrapIngressAndHeadlessServiceForSoilOnSoil ({ coreClient, soilSeedResource }) {
  const soilKubeconfig = await getSeedKubeconfig({ coreClient, seed: soilSeedResource })
  const soilClientConfig = kubernetes.fromKubeconfig(soilKubeconfig)
  const soilCoreClient = kubernetes.core(soilClientConfig)
  const soilExtensionClient = kubernetes.extensions(soilClientConfig)

  const namespace = 'garden'
  const soilApiserverHostname = new URL(soilClientConfig.url).hostname
  const soilIngressDomain = await getSoilIngressDomainForSeed(soilSeedResource)
  await bootstrapIngressAndHeadlessService({
    coreClient: soilCoreClient,
    extensionClient: soilExtensionClient,
    namespace,
    apiserverHostname: soilApiserverHostname,
    ingressDomain: soilIngressDomain
  })
}

async function bootstrapIngressAndHeadlessService ({ coreClient, extensionClient, namespace, apiserverHostname, ingressDomain }) {
  let service
  // replace headless service
  if (isIp(apiserverHostname)) {
    const ip = apiserverHostname
    await replaceEndpointKubeApiserver({ coreClient, namespace, ip })

    service = await replaceServiceKubeApiserver({ coreClient, namespace })
  } else {
    const externalName = apiserverHostname
    service = await replaceServiceKubeApiserver({ coreClient, namespace, externalName })
  }
  const serviceName = service.metadata.name

  const apiserverIngressHost = `api.${ingressDomain}`

  await replaceIngressApiServer({
    extensionClient,
    namespace,
    serviceName,
    host: apiserverIngressHost
  }) // TODO owner reference ?
}

function isTerminalBootstrapDisabled () {
  return _.get(config, 'terminal.bootstrap.disabled', true) // TODO enable by default
}

function verifyRequiredConfigExists () {
  if (isTerminalBootstrapDisabled()) {
    logger.debug('terminal bootstrap disabled by config')
    return false // no further checks needed, bootstrapping is disabled
  }
  const requiredConfigs = [
    'terminal.bootstrap.apiserverIngress.annotations',
    'terminal.cleanup.image',
    'terminal.gardenCluster.seed',
    'terminal.gardenCluster.namespace'
  ]

  let requiredConfigExists = true
  _.forEach(requiredConfigs, requiredConfig => {
    if (_.isEmpty(_.get(config, requiredConfig))) {
      logger.error(`required terminal config '${requiredConfig}' not found`)
      requiredConfigExists = false
    }
  })

  return requiredConfigExists
}

function bootstrapSeed ({ seed }) {
  if (isTerminalBootstrapDisabled()) {
    return
  }
  if (!requiredConfigExists) {
    return
  }
  const isBootstrapDisabledForSeed = _.get(seed, ['metadata', 'annotations', 'dashboard.garden.sapcloud.io/terminal-bootstrap-resources-disabled'], false)
  if (isBootstrapDisabledForSeed) {
    const name = _.get(seed, 'metadata.name')
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }

  bootstrapQueue.push(seed)
}

async function bootstrapGardener () {
  console.log('bootstrapping garden cluster')

  const seedName = getConfigValue({ path: 'terminal.gardenCluster.seed' })
  const scheduleNamespace = getConfigValue({ path: 'terminal.gardenCluster.namespace' })
  const virtualGardenKubeconfigName = getConfigValue({ path: 'terminal.gardenCluster.virtualGardenKubeconfigName', required: false })

  const gardenClient = kubernetes.garden()
  const gardenCoreClient = kubernetes.core()
  const gardenRbacClient = kubernetes.rbac()

  const seed = await getSeed({ gardenClient, name: seedName })
  if (!seed) {
    throw new Error(`Could not find seed with name ${seedName}`)
  }
  const seedKubeconfig = await getSeedKubeconfig({ coreClient: gardenCoreClient, seed })
  if (!seedKubeconfig) {
    throw new Error('could not fetch seed kubeconfig')
  }
  const seedClientConfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedCoreClient = kubernetes.core(seedClientConfig)
  const seedRbacClient = kubernetes.rbac(seedClientConfig)
  const seedBatchClient = kubernetes.batch(seedClientConfig)

  const gardenClientConfig = await getTargetClusterClientConfig({ coreClient: seedCoreClient, namespace: scheduleNamespace, kubeconfigSecretName: virtualGardenKubeconfigName })
  if (!gardenClientConfig) {
    throw new Error('could not initialize gardenClientConfig')
  }

  // TODO create cleanup kubeconfig for saType attach in case the cluster is not a seed cluster
  // create cleanup resources
  // await createCleanupKubeconfig({ saClientConfig: seedClientConfig, saCoreClient: seedCoreClient, saRbacClient: seedRbacClient, kubecfgCoreClient: seedCoreClient, name: TERMINAL_CLEANUP, namespace: scheduleNamespace, clusterRolebindingName: CLUSTER_ROLE_BINDING_NAME_CLEANUP }) // TODO bootstrapping for cleaning up in-cluster service accounts already handled as cluster is a seed cluster, kubeconfig instead of seed(name) in terminal config?
  const cleanupKubeconfigSecretName = await createCleanupKubeconfig({ saClientConfig: gardenClientConfig, saCoreClient: gardenCoreClient, saRbacClient: gardenRbacClient, kubecfgCoreClient: seedCoreClient, name: TERMINAL_CLEANUP_GARDEN, namespace: scheduleNamespace, clusterRolebindingName: CLUSTER_ROLE_BINDING_NAME_CLEANUP_GARDEN })
  await replaceCronJobCleanup({ batchClient: seedBatchClient, name: TERMINAL_CLEANUP_GARDEN, namespace: scheduleNamespace, kubeconfigSecretName: cleanupKubeconfigSecretName, saType: SaTypeEnum.access }) // TODO ownerReference

  await bootstrapAttachResources({ rbacClient: seedRbacClient }) // TODO ownerReference
}

async function getSeed ({ gardenClient, name }) {
  try {
    return await gardenClient.seeds.get({ name })
  } catch (err) {
    if (err.code !== 404) {
      throw err
    } else {
      return undefined
    }
  }
}

const requiredConfigExists = verifyRequiredConfigExists()

const options = {}
_.assign(options, _.get(config, 'terminal.bootstrap.queueOptions'))
var bootstrapQueue = new Queue(async (seed, cb) => {
  try {
    await handleSeed(seed)
    cb(null, null)
  } catch (err) {
    logger.error(`failed to bootstrap terminal resources for seed ${seed.metadata.name}`, err)
    cb(err, null)
  }
}, options)

if (!isTerminalBootstrapDisabled() && requiredConfigExists) {
  bootstrapGardener()
    .catch(error => {
      logger.error('failed to bootstrap terminal resources for garden cluster', error)
    })
}

module.exports = {
  bootstrapSeed
}
