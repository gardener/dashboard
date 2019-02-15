
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
const { getSeedKubeconfig } = require('../utils')
const { isSeedNotProtectedAndVisible } = require('../utils/seeds')
const kubernetes = require('../kubernetes')
const {
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource
} = require('./terminalResources')

function core () {
  return kubernetes.core()
}

const COMPONENT_TERMINAL = 'dashboard-terminal'
const COMPONENT_TERMINAL_CLEANUP_NAME = 'dashboard-terminal-cleanup'

const GARDEN_NAMESPACE = 'garden'
const CLUSTER_ROLE_NAME_CLEANUP = 'garden.sapcloud.io:dashboard-terminal-cleanup'
const CLUSTER_ROLE_BINDING_NAME_CLEANUP = CLUSTER_ROLE_NAME_CLEANUP
const SERVICEACCOUNT_NAME_CLEANUP = COMPONENT_TERMINAL_CLEANUP_NAME
const CRONJOB_NAME_CLEANUP = COMPONENT_TERMINAL_CLEANUP_NAME

async function replaceClusterroleAttach ({ rbacClient }) {
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
  return rbacClient.clusterrole.put({ name, body: toClusterRoleResource({ name, component, rules }) })
}

async function replaceClusterroleCleanup ({ rbacClient }) {
  const name = CLUSTER_ROLE_NAME_CLEANUP
  const component = COMPONENT_TERMINAL_CLEANUP_NAME
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
  return rbacClient.clusterrole.put({ name, body: toClusterRoleResource({ name, component, rules }) })
}

async function replaceClusterroleBindingCleanup ({ rbacClient, saName, saNamespace }) {
  const name = CLUSTER_ROLE_BINDING_NAME_CLEANUP
  const clusterRoleName = CLUSTER_ROLE_NAME_CLEANUP
  const component = COMPONENT_TERMINAL_CLEANUP_NAME

  return rbacClient.clusterrolebinding.put({ name, body: toClusterRoleBindingResource({ name, clusterRoleName, component, saName, saNamespace }) })
}

async function replaceServiceAccountCleanup ({ coreClient }) {
  const name = SERVICEACCOUNT_NAME_CLEANUP
  const namespace = GARDEN_NAMESPACE
  const component = COMPONENT_TERMINAL_CLEANUP_NAME

  const body = toServiceAccountResource({ name, component })
  const client = coreClient.ns(namespace).serviceaccounts

  return replaceResource({ client, name, body })
}

async function replaceCronJobCleanup ({ batchClient, saName }) {
  const name = CRONJOB_NAME_CLEANUP
  const namespace = GARDEN_NAMESPACE
  const component = COMPONENT_TERMINAL_CLEANUP_NAME
  const image = 'psutter/gardener-cleanup-terminal:latest' // TODO 
  const noHeartbeatDeleteSeconds = String(_.get(config, 'terminal.cleanup.noHeartbeatDeleteSeconds', 300))
  const schedule = _.get(config, 'terminal.cleanup.schedule', '*/5 * * * *')

  const cronSpec = {
    concurrencyPolicy: 'Forbid',
    schedule,
    jobTemplate: {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: COMPONENT_TERMINAL_CLEANUP_NAME,
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

  const body = toCronjobResource({ name, component, cronSpec })
  const client = batchClient.ns(namespace).cronjob

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

    await replaceClusterroleCleanup({ rbacClient: seedRbacClient })
    await replaceClusterroleAttach({ rbacClient: seedRbacClient })
    const { metadata: { name: saName, namespace: saNamespace } } = await replaceServiceAccountCleanup({ coreClient: seedCoreClient })
    await replaceClusterroleBindingCleanup({ rbacClient: seedRbacClient, saName, saNamespace })
    await replaceCronJobCleanup({ batchClient: seedBatchClient, saName })

    cb(null, null)
  } catch (error) {
    logger.error(`failed to bootstrap seed ${name}`, error)
    cb(error, null)
  }
}, options)

function bootstrapSeed ({ seed }) {
  const terminalBoostrapDisabled = _.get(config, 'terminal.bootstrapResourcesDisabled', false)
  if (terminalBoostrapDisabled) {
    return
  }
  const isBootstrapDisabledForSeed = _.get(seed, ['metadata', 'annotations', 'garden.sapcloud.io/terminal-bootstrap-resources-disabled'], false)
  if (isBootstrapDisabledForSeed) {
    const name = _.get(seed, 'metadata.name')
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }
  if (isSeedNotProtectedAndVisible(seed)) {
    return
  }

  bootstrapQueue.push(seed)
}

module.exports = {
  bootstrapSeed
}
