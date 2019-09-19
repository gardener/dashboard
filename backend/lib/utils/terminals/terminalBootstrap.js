
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
const { NotImplemented } = require('../../errors')
const {
  getKubeconfig,
  getSeedKubeconfig,
  getShootIngressDomain,
  getSeedIngressDomain,
  getConfigValue
} = require('..')
const kubernetes = require('../../kubernetes')
const {
  toIngressResource,
  toEndpointResource,
  toServiceResource
} = require('./terminalResources')
const {
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  GardenTerminalHostRefType
} = require('./')
const shoots = require('../../services/shoots')

const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

class Handler {
  constructor (fn, description) {
    this.fn = fn
    this._run = () => fn()
    this._description = description
  }

  run () {
    return this._run()
  }

  get description () {
    return this._description
  }
}

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

async function replaceIngressApiServer ({ name = TERMINAL_KUBE_APISERVER, extensionClient, namespace, host, serviceName, ownerReferences, annotations, secretName }) {
  if (!secretName) {
    secretName = `${name}-tls`
  }

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
        secretName
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

async function replaceServiceKubeApiServer ({ name = TERMINAL_KUBE_APISERVER, coreClient, namespace, externalName = undefined, ownerReferences, clusterIP = 'None' }) {
  let type
  if (externalName) {
    type = 'ExternalName'
  }

  const spec = {
    clusterIP,
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

  // now make sure a a browser-trusted certificate is presented for the kube-apiserver
  const isShootedSeed = await shoots.exists({ gardenClient, namespace, name })
  if (isShootedSeed) {
    await ensureTrustedCertForShootApiServer({ gardenClient, coreClient, namespace, name })
  } else {
    await ensureTrustedCertForSeedApiServer({ coreClient, seed })
  }
}

async function handleShoot (shoot) {
  const name = shoot.metadata.name
  const namespace = shoot.metadata.namespace
  logger.debug(`replacing shoot's apiserver ingress ${name} for webterminals`)
  const coreClient = kubernetes.core()
  const gardenClient = kubernetes.garden()

  await ensureTrustedCertForShootApiServer({ gardenClient, coreClient, namespace, name })
}

/*
  Currently the kube apiserver of a shoot presents a certificate signed by a custom CA root certificate which is usually not trusted by a browser.
  As for the web terminals, the frontend client opens a websocket connection directly to the kube apiserver. This requires a browser trusted certificate.
  Preferred, the gardener provides the kube-apiserver a browser trusted certificate using the `--tls-sni-cert-key` argument.
  Until this is the case we need to workaround this by creating an ingress (e.g. with the respective certmanager annotations) so that a proper certificate is presented for the kube-apiserver.
  https://github.com/gardener/gardener/issues/1413
*/
async function ensureTrustedCertForShootApiServer ({ gardenClient, coreClient, namespace, name }) {
  const shootResource = await shoots.read({ gardenClient, namespace, name })

  // fetch seed resource
  const seedName = shootResource.spec.cloud.seed
  const seedResource = await gardenClient.seeds.get({ name: seedName })

  // get seed client
  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed: seedResource })
  const seedExtensionClient = kubernetes.extensions(kubernetes.fromKubeconfig(seedKubeconfig))

  // calculate ingress domain
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = coreClient.namespaces
  const shootIngressDomain = await getShootIngressDomain(projectsClient, namespacesClient, shootResource, seedResource)
  const apiServerIngressHost = `api.${shootIngressDomain}`

  const seedShootNS = _.get(shootResource, 'status.technicalID')
  if (!seedShootNS) {
    throw new Error(`could not get namespace on seed for shoot ${namespace}/${name}`)
  }

  const serviceName = 'kube-apiserver'
  const annotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')
  await replaceIngressApiServer({
    extensionClient: seedExtensionClient,
    namespace: seedShootNS,
    serviceName,
    host: apiServerIngressHost,
    annotations
  })
}

/*
 Make sure a a browser-trusted certificate is presented for the kube-apiserver of the garden terminal host cluster. This cluster runs the terminal pods of garden operators for the virtual garden.
*/
async function ensureTrustedCertForGardenTerminalHostApiServer () {
  logger.debug(`replacing resources on garden host cluster for webterminals`)

  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const coreClient = kubernetes.core()

      const { name, namespace } = await getGardenTerminalHostClusterSecretRef({ coreClient })

      const hostKubeconfig = await getKubeconfig({ coreClient, name, namespace })
      const hostClientConfig = kubernetes.fromKubeconfig(hostKubeconfig)
      const hostCoreClient = kubernetes.core(hostClientConfig)
      const hostExtensionClient = kubernetes.extensions(hostClientConfig)

      const hostNamespace = getConfigValue('terminal.bootstrap.gardenTerminalHost.namespace', 'garden')
      const apiServerHostname = new URL(hostClientConfig.url).hostname
      const apiServerIngressHost = getConfigValue('terminal.gardenTerminalHost.apiServerIngressHost')

      const ingressAnnotations = getConfigValue('terminal.bootstrap.gardenTerminalHost.apiServerIngress.annotations')
      return ensureTrustedCertForApiServer({
        coreClient: hostCoreClient,
        extensionClient: hostExtensionClient,
        name: 'garden-host-cluster-apiserver',
        namespace: hostNamespace,
        apiServerHostname,
        apiServerIngressHost,
        ingressAnnotations
      })
    }
    default:
      throw new NotImplemented(`bootstrapping garden terminal host cluster for refType ${refType} not yet implemented`)
  }
}

async function ensureTrustedCertForSeedApiServer ({ coreClient, seed }) {
  const projectsClient = kubernetes.garden().projects
  const namespacesClient = coreClient.namespaces

  const seedKubeconfig = await getSeedKubeconfig({ coreClient, seed })
  const seedClientConfig = kubernetes.fromKubeconfig(seedKubeconfig)
  const seedCoreClient = kubernetes.core(seedClientConfig)
  const seedExtensionClient = kubernetes.extensions(seedClientConfig)

  const namespace = 'garden'
  const seedApiServerHostname = new URL(seedClientConfig.url).hostname
  const seedIngressDomain = await getSeedIngressDomain(projectsClient, namespacesClient, seed)
  const seedApiServerIngressHost = `api.${seedIngressDomain}`
  const ingressAnnotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')

  await ensureTrustedCertForApiServer({
    coreClient: seedCoreClient,
    extensionClient: seedExtensionClient,
    namespace,
    apiServerHostname: seedApiServerHostname,
    apiServerIngressHost: seedApiServerIngressHost,
    ingressAnnotations
  })
}

async function ensureTrustedCertForApiServer ({ coreClient, extensionClient, namespace, apiServerHostname, apiServerIngressHost, ingressAnnotations, name }) {
  let service
  // replace headless service
  if (net.isIP(apiServerHostname) !== 0) {
    const ip = apiServerHostname
    await replaceEndpointKubeApiServer({ coreClient, namespace, ip, name })

    service = await replaceServiceKubeApiServer({ coreClient, namespace, name })
  } else {
    const externalName = apiServerHostname
    service = await replaceServiceKubeApiServer({ coreClient, namespace, externalName, name })
  }
  const serviceName = service.metadata.name

  await replaceIngressApiServer({
    extensionClient,
    name,
    namespace,
    serviceName,
    host: apiServerIngressHost,
    annotations: ingressAnnotations,
    secretName: `${name}-tls`
  })
}

function isTerminalBootstrapDisabled () {
  return _.get(config, 'terminal.bootstrap.disabled', true)
}

function isTerminalBootstrapDisabledForKind (kind) {
  kind = kind.replace(/^\w/, c => c.toLowerCase()) // lower first character (Shoot -> shoot)
  return _.get(config, `terminal.bootstrap.${kind}Disabled`, false)
}

function verifyRequiredConfigExists () {
  if (isTerminalBootstrapDisabled()) {
    logger.debug('terminal bootstrap disabled by config')
    return false // no further checks needed, bootstrapping is disabled
  }
  const requiredConfigs = [
    'terminal.bootstrap.apiServerIngress.annotations'
  ]
  if (!isTerminalBootstrapDisabledForKind('gardenTerminalHost')) {
    // bootstrapping of gardenTerminalHost only makes sense when using terminal.gardenTerminalHost.secretRef (for which default values exist)
    // for refType "secretRef", the apiServerIngressHost config is required as it cannot be determined automatically
    requiredConfigs.concat([
      'terminal.gardenTerminalHost.apiServerIngressHost',
      'terminal.bootstrap.gardenTerminalHost.apiServerIngress.annotations'
    ])
  }

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
  const kind = resource.kind
  if (!bootstrapKindAllowed(kind)) {
    return
  }

  const isBootstrapDisabledForResource = _.get(resource, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-resources-disabled'], 'false') === 'true'
  if (isBootstrapDisabledForResource) {
    const name = resource.metadata.name
    logger.debug(`terminal bootstrap disabled for seed ${name}`)
    return
  }

  const description = `${kind} - ${resource.metadata.name}`
  const handler = new Handler(() => {
    switch (kind) {
      case 'Seed':
        return handleSeed(resource)
      case 'Shoot':
        return handleShoot(resource)
      default:
        logger.error(`can't bootstrap unsupported kind ${kind}`)
    }
  }, description)

  bootstrapQueue.push(handler)
}

function bootstrapKindAllowed (kind) {
  if (isTerminalBootstrapDisabled()) {
    return false
  }
  if (isTerminalBootstrapDisabledForKind(kind)) {
    return false
  }
  if (!requiredConfigExists) {
    return false
  }
  return true
}

const requiredConfigExists = verifyRequiredConfigExists()

const options = {}
_.assign(options, _.get(config, 'terminal.bootstrap.queueOptions'))
const bootstrapQueue = new Queue(async (handler, cb) => {
  try {
    await handler.run()
    cb(null, null)
  } catch (err) {
    logger.error(`failed to bootstrap ${handler.description}`, err)
    cb(err, null)
  }
}, options)

if (bootstrapKindAllowed('gardenTerminalHost')) {
  const description = 'garden host cluster'
  const handler = new Handler(ensureTrustedCertForGardenTerminalHostApiServer, description)

  bootstrapQueue.push(handler)
}

module.exports = {
  bootstrapResource
}
