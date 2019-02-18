
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
const Queue = require('better-queue')

const _ = require('lodash')
const logger = require('../logger')
const config = require('../config')
const {
  getSeedKubeconfig,
  getShootIngressDomainForSeed,
  createOwnerRefArrayForServiceAccount
} = require('../utils')
const kubernetes = require('../kubernetes')
const {
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource,
  toIngressResource
} = require('./terminalResources')
const shoots = require('../services/shoots')

function core () {
  return kubernetes.core()
}

function garden () {
  return kubernetes.garden()
}

const COMPONENT_TERMINAL = 'dashboard-terminal'
const COMPONENT_TERMINAL_CLEANUP = 'dashboard-terminal-cleanup'

const GARDEN_NAMESPACE = 'garden'
const CLUSTER_ROLE_NAME_CLEANUP = 'garden.sapcloud.io:dashboard-terminal-cleanup'
const CLUSTER_ROLE_BINDING_NAME_CLEANUP = CLUSTER_ROLE_NAME_CLEANUP
const SERVICEACCOUNT_NAME_CLEANUP = COMPONENT_TERMINAL_CLEANUP
const CRONJOB_NAME_CLEANUP = COMPONENT_TERMINAL_CLEANUP

async function replaceClusterroleAttach ({ rbacClient, ownerReferences }) {
  const name = 'garden.sapcloud.io:dashboard-terminal-attach'
  const component = COMPONENT_TERMINAL
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
    }
  ]
  return rbacClient.clusterrole.put({ name, body: toClusterRoleResource({ name, component, rules, ownerReferences }) })
}

async function replaceClusterroleCleanup ({ rbacClient, ownerReferences }) {
  const name = CLUSTER_ROLE_NAME_CLEANUP
  const component = COMPONENT_TERMINAL_CLEANUP
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
  return rbacClient.clusterrole.put({ name, body: toClusterRoleResource({ name, component, rules, ownerReferences }) })
}

async function replaceClusterroleBindingCleanup ({ rbacClient, saName, saNamespace, ownerReferences }) {
  const name = CLUSTER_ROLE_BINDING_NAME_CLEANUP
  const clusterRoleName = CLUSTER_ROLE_NAME_CLEANUP
  const component = COMPONENT_TERMINAL_CLEANUP

  return rbacClient.clusterrolebinding.put({ name, body: toClusterRoleBindingResource({ name, clusterRoleName, component, saName, saNamespace, ownerReferences }) })
}

async function replaceServiceAccountCleanup ({ coreClient }) {
  const name = SERVICEACCOUNT_NAME_CLEANUP
  const namespace = GARDEN_NAMESPACE
  const component = COMPONENT_TERMINAL_CLEANUP

  const body = toServiceAccountResource({ name, component })
  const client = coreClient.ns(namespace).serviceaccounts

  return replaceResource({ client, name, body })
}

async function replaceCronJobCleanup ({ batchClient, saName, ownerReferences }) {
  const name = CRONJOB_NAME_CLEANUP
  const namespace = GARDEN_NAMESPACE
  const component = COMPONENT_TERMINAL_CLEANUP
  const image = 'psutter/gardener-cleanup-terminal:latest' // TODO
  const noHeartbeatDeleteSeconds = String(_.get(config, 'terminal.cleanup.noHeartbeatDeleteSeconds', 300))
  const schedule = _.get(config, 'terminal.cleanup.schedule', '*/5 * * * *')

  const spec = {
    concurrencyPolicy: 'Forbid',
    schedule,
    jobTemplate: {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: COMPONENT_TERMINAL_CLEANUP,
                image,
                imagePullPolicy: 'Always',
                env: [
                  {
                    name: 'NO_HEARTBEAT_DELETE_SECONDS',
                    value: noHeartbeatDeleteSeconds
                  }
                ]
              }
            ],
            restartPolicy: 'OnFailure',
            serviceAccountName: saName
          }
        }
      }
    }
  }

  const body = toCronjobResource({ name, component, spec, ownerReferences })
  const client = batchClient.ns(namespace).cronjob

  return replaceResource({ client, name, body })
}

async function replaceIngressApiServer ({ extensionClient, namespace, host, ownerReferences }) {
  const name = 'apiserver'
  const component = COMPONENT_TERMINAL

  const annotations = {
    'certmanager.k8s.io/cluster-issuer': 'lets-encrypt',
    'kubernetes.io/ingress.class': 'nginx',
    'certmanager.k8s.io/acme-challenge-type': 'dns01',
    'certmanager.k8s.io/acme-dns01-provider': 'route53',
    'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS'
  }

  const spec = {
    rules: [
      {
        host,
        http: {
          paths: [
            {
              backend: {
                serviceName: 'kube-apiserver',
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
        secretName: 'apiserver-tls'
      }
    ]
  }

  const body = toIngressResource({ name, component, annotations, spec, ownerReferences })
  const client = extensionClient.ns(namespace).ingress

  return replaceResource({ client, name, body })
}

async function replaceResource ({ client, name, body }) {
  // TODO check why put is not sufficient for replacing the secret
  try {
    await client.get({ name })
    return client.put({ name, body })
  } catch (err) {
    if (err.code === 404) {
      return client.post({ body })
    }
    throw err
  }
}

const options = {
  afterProcessDelay: 5000
}
var bootstrapQueue = new Queue(async function (seed, cb) {
  const name = _.get(seed, 'metadata.name')
  logger.debug(`creating / updating resources on seed ${name} for webterminals`)
  try {
    const coreClient = core()
    const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed })
    if (!seedKubeconfig) {
      throw new Error(`could not get seed kubeconfig`)
    }
    const fromSeedKubeconfig = kubernetes.fromKubeconfig(seedKubeconfig)
    const seedCoreClient = kubernetes.core(fromSeedKubeconfig)
    const seedRbacClient = kubernetes.rbac(fromSeedKubeconfig)
    const seedBatchClient = kubernetes.batch(fromSeedKubeconfig)

    // TODO maybe it makes more sense that the cleanup component itself sets up the required resources
    const serviceAccountResource = await replaceServiceAccountCleanup({ coreClient: seedCoreClient })
    const { metadata: { name: saName, namespace: saNamespace } } = serviceAccountResource
    const ownerReferences = createOwnerRefArrayForServiceAccount(serviceAccountResource)
    await replaceClusterroleCleanup({ rbacClient: seedRbacClient, ownerReferences })
    await replaceClusterroleBindingCleanup({ rbacClient: seedRbacClient, saName, saNamespace, ownerReferences })
    await replaceCronJobCleanup({ batchClient: seedBatchClient, saName, ownerReferences })

    await replaceClusterroleAttach({ rbacClient: seedRbacClient, ownerReferences }) // TODO use same owner ref as cleanup resources??

    // replace ingress for api-server on soil in seedShootNS
    let seedShootResource
    try {
      seedShootResource = await shoots.read({ gardenClient: garden(), namespace: 'garden', name })
    } catch (err) {
      if (err.code !== 404) {
        throw err
      }
      // else (404): there is no shoot resource for seed, which means it's the soil
    }
    if (seedShootResource) {
      // fetch soil's seed resource
      const soilName = _.get(seedShootResource, 'spec.cloud.seed')
      const soilSeedResource = await garden().seeds.get({ name: soilName })

      // calculate ingress domain
      const soilIngressDomain = await getShootIngressDomainForSeed(seedShootResource, soilSeedResource)
      const apiserverHost = `api.${soilIngressDomain}`

      // get client
      const seed = soilSeedResource
      const soilKubeconfig = await getSeedKubeconfig({ coreClient, seed })
      const fromSoilKubeconfig = kubernetes.fromKubeconfig(soilKubeconfig)
      const soilExtensionClient = kubernetes.extensions(fromSoilKubeconfig)

      // replace ingress api-server resource
      const seedShootNS = _.get(seedShootResource, 'status.technicalID')
      await replaceIngressApiServer({ extensionClient: soilExtensionClient, namespace: seedShootNS, host: apiserverHost }) // TODO owner reference ?
    }

    cb(null, null)
  } catch (error) {
    logger.error(`failed to bootstrap seed ${name}`, error)
    cb(error, null)
  }
}, options)

function bootstrapSeed ({ seed }) {
  const terminalBoostrapDisabled = _.get(config, 'terminal.bootstrapResourcesDisabled', true) // TODO enable by default
  if (terminalBoostrapDisabled) {
    return
  }
  const isBootstrapDisabledForSeed = _.get(seed, ['metadata', 'annotations', 'garden.sapcloud.io/terminal-bootstrap-resources-disabled'], false)
  if (isBootstrapDisabledForSeed) {
    const name = _.get(seed, 'metadata.name')
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }

  bootstrapQueue.push(seed)
}

module.exports = {
  bootstrapSeed
}
