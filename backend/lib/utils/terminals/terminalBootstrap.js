
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
const _ = require('lodash')
const net = require('net')

const logger = require('../../logger')
const config = require('../../config')
const {
  getSeedKubeconfig,
  getShootIngressDomainForSeed,
  getSoilIngressDomainForSeed
} = require('..')
const kubernetes = require('../../kubernetes')
const {
  toIngressResource,
  toEndpointResource,
  toServiceResource
} = require('./terminalResources')
const shoots = require('../../services/shoots')

const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

async function replaceResource ({ client, name, body }) {
  try {
    await client.get({ name })
    return client.mergePatch({ name, body })
  } catch (err) {
    if (err.code === 404) {
      return client.post({ body })
    }
    throw err
  }
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

async function replaceEndpointKubeApiServer ({ name = TERMINAL_KUBE_APISERVER, coreClient, namespace, ip, ownerReferences }) {
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

async function replaceServiceKubeApiServer ({ name = TERMINAL_KUBE_APISERVER, coreClient, namespace, externalName = undefined, ownerReferences }) {
  let type
  if (externalName) {
    type = 'ExternalName'
  }

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

  // now make sure we expose the kube-apiserver with a browser-trusted certificate
  const isSoil = _.get(seed, ['metadata', 'labels', 'garden.sapcloud.io/role']) === 'soil' || !await existsShoot({ gardenClient, seedName: name })
  if (isSoil) {
    const soilSeedResource = seed
    await bootstrapIngressAndHeadlessServiceForSoilOnSoil({ coreClient, soilSeedResource })
  } else {
    await bootstrapIngressForSeedOnSoil({ gardenClient, coreClient, seedName: name })
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
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = kubernetes.core().namespaces
  const soilIngressDomain = await getShootIngressDomainForSeed(projectsClient, namespacesClient, seedShootResource, soilSeedResource)
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
  })
}

async function bootstrapIngressAndHeadlessServiceForSoilOnSoil ({ coreClient, soilSeedResource }) {
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = kubernetes.core().namespaces

  const soilKubeconfig = await getSeedKubeconfig({ coreClient, seed: soilSeedResource })
  const soilClientConfig = kubernetes.fromKubeconfig(soilKubeconfig)
  const soilCoreClient = kubernetes.core(soilClientConfig)
  const soilExtensionClient = kubernetes.extensions(soilClientConfig)

  const namespace = 'garden'
  const soilApiserverHostname = new URL(soilClientConfig.url).hostname
  const soilIngressDomain = await getSoilIngressDomainForSeed(projectsClient, namespacesClient, soilSeedResource)
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
  if (net.isIP(apiserverHostname) !== 0) {
    const ip = apiserverHostname
    await replaceEndpointKubeApiServer({ coreClient, namespace, ip })

    service = await replaceServiceKubeApiServer({ coreClient, namespace })
  } else {
    const externalName = apiserverHostname
    service = await replaceServiceKubeApiServer({ coreClient, namespace, externalName })
  }
  const serviceName = service.metadata.name

  const apiserverIngressHost = `api.${ingressDomain}`

  await replaceIngressApiServer({
    extensionClient,
    namespace,
    serviceName,
    host: apiserverIngressHost
  })
}

function isTerminalBootstrapDisabled () {
  return _.get(config, 'terminal.bootstrap.disabled', true)
}

function verifyRequiredConfigExists () {
  if (isTerminalBootstrapDisabled()) {
    logger.debug('terminal bootstrap disabled by config')
    return false // no further checks needed, bootstrapping is disabled
  }
  const requiredConfigs = [
    'terminal.bootstrap.apiserverIngress.annotations'
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
  const isBootstrapDisabledForSeed = _.get(seed, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-resources-disabled'], 'false') === 'true'
  if (isBootstrapDisabledForSeed) {
    const name = _.get(seed, 'metadata.name')
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }

  bootstrapQueue.push(seed)
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

module.exports = {
  bootstrapSeed
}
