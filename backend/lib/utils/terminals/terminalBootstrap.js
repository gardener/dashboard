
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
  getShootIngressDomain,
  getSeedIngressDomain
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

async function handleSeed (seed) {
  const name = seed.metadata.name
  const namespace = 'garden'

  logger.debug(`replacing resources on seed ${name} for webterminals`)
  const coreClient = kubernetes.core()
  const gardenClient = kubernetes.garden()

  // now make sure we expose the kube-apiserver with a browser-trusted certificate
  const isShootedSeed = await shoots.exists({ gardenClient, namespace, name })
  if (isShootedSeed) {
    await bootstrapShootIngress({ gardenClient, coreClient, namespace, name })
  } else {
    await bootstrapIngressAndHeadlessServiceForSeed({ coreClient, seed })
  }
}

async function handleShoot (shoot, cb) {
  const name = shoot.metadata.name
  const namespace = shoot.metadata.namespace
  logger.debug(`replacing shoot's apiserver ingress ${name} for webterminals`)
  const coreClient = kubernetes.core()
  const gardenClient = kubernetes.garden()

  await bootstrapShootIngress({ gardenClient, coreClient, namespace, name })
}

/*
  Currently the kube apiserver of a shoot presents a certificate signed by a custom CA root certificate which is usually not trusted by a browser.
  As for the web terminals, the frontend client opens a websocket connection directly to the kube apiserver. This requires a browser trusted certificate.
  Preferred, the gardener provides the kube apiserver a browser trusted certificate using the `--tls-sni-cert-key` argument.
  Until this is the case we need to workaround this by creating an ingress (e.g. with the respective certmanager annotations) so that a proper certificate is presented for the kube apiserver.
*/
async function bootstrapShootIngress ({ gardenClient, coreClient, namespace, name }) {
  const shootResource = await shoots.read({ gardenClient, namespace, name })

  // fetch seed resource
  const seedName = shootResource.spec.cloud.seed
  const seedResource = await gardenClient.seeds.get({ name: seedName })

  // get seed client
  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed: seedResource })
  const seedExtensionClient = kubernetes.extensions(kubernetes.fromKubeconfig(seedKubeconfig))

  // calculate ingress domain
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = kubernetes.core().namespaces
  const shootIngressDomain = await getShootIngressDomain(projectsClient, namespacesClient, shootResource, seedResource)
  const apiserverIngressHost = `api.${shootIngressDomain}`

  // replace ingress apiserver resource
  const seedShootNS = _.get(shootResource, 'status.technicalID')
  if (!seedShootNS) {
    throw new Error(`could not get namespace on seed for shoot ${namespace}/${name}`)
  }

  const serviceName = 'kube-apiserver'
  await replaceIngressApiServer({
    extensionClient: seedExtensionClient,
    namespace: seedShootNS,
    serviceName,
    host: apiserverIngressHost
  })
}

async function bootstrapIngressAndHeadlessServiceForSeed ({ coreClient, seed }) {
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = kubernetes.core().namespaces

  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed })
  const seedClientConfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedCoreClient = kubernetes.core(seedClientConfig)
  const seedExtensionClient = kubernetes.extensions(seedClientConfig)

  const namespace = 'garden'
  const seedApiserverHostname = new URL(seedClientConfig.url).hostname
  const seedIngressDomain = await getSeedIngressDomain(projectsClient, namespacesClient, seed)
  await bootstrapIngressAndHeadlessService({
    coreClient: seedCoreClient,
    extensionClient: seedExtensionClient,
    namespace,
    apiserverHostname: seedApiserverHostname,
    ingressDomain: seedIngressDomain
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

function isTerminalBootstrapDisabledForKind (kind) {
  kind = kind.toLowerCase()
  return _.get(config, `terminal.bootstrap.${kind}Disabled`, false)
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

function bootstrapResource (resource) {
  if (isTerminalBootstrapDisabled()) {
    return
  }
  const kind = resource.kind
  if (isTerminalBootstrapDisabledForKind(resource.kind)) {
    return
  }
  if (!requiredConfigExists) {
    return
  }
  const isBootstrapDisabledForResource = _.get(resource, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-resources-disabled'], 'false') === 'true'
  if (isBootstrapDisabledForResource) {
    const name = resource.metadata.name
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }
  bootstrapQueue.push({ resource, kind })
}

const requiredConfigExists = verifyRequiredConfigExists()

const options = {}
_.assign(options, _.get(config, 'terminal.bootstrap.queueOptions'))
const bootstrapQueue = new Queue(async ({ resource, kind }, cb) => {
  try {
    if (kind === 'Seed') {
      await handleSeed(resource)
    } else if (kind === 'Shoot') {
      await handleShoot(resource)
    } else {
      logger.error(`can't bootstrap unsupported kind ${kind}`)
    }
    cb(null, null)
  } catch (err) {
    logger.error(`failed to bootstrap terminal resources for ${kind} ${resource.metadata.name}`, err)
    cb(err, null)
  }
}, options)

module.exports = {
  bootstrapResource
}
