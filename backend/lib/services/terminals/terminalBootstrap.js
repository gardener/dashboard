
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
  dashboardClient,
  isHttpError
} = require('../../kubernetes-client')

const {
  getConfigValue,
  getSeedNameFromShoot
} = require('../../utils')

const {
  toIngressResource,
  toEndpointResource,
  toServiceResource
} = require('./terminalResources')

const {
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  getKubeApiServerHostForShoot,
  getKubeApiServerHostForSeed,
  getWildcardIngressDomainForSeed,
  GardenTerminalHostRefType
} = require('./utils')

const { getSeed } = require('../../cache')

const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

class BootstrapPendingSet extends Set {
  _keyForResource (resource) {
    const kind = resource.kind
    const { metadata: { name, namespace } } = resource
    return `${kind}/${namespace}/${name}`
  }

  containsResource (resource) {
    const key = this._keyForResource(resource)
    return this.has(key)
  }

  removeResource (resource) {
    const key = this._keyForResource(resource)
    return this.delete(key)
  }

  addResource (resource) {
    const key = this._keyForResource(resource)
    this.add(key)
    return key
  }
}

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

function seedShootNamespaceExists ({ status, spec }) {
  /*
    If the technicalID is set and the progress is over 10% (best guess), then we assume that the namespace on the seed exists for this shoot.
    Currently there is no better indicator, except trying to get the namespace on the seed - which we want to avoid for performance reasons.
  */
  if (!status) {
    return false
  }
  return status.technicalID && spec.seedName && _.get(status, 'lastOperation.progress', 0) > 10
}

async function replaceResource (resource, { namespace, name, body }) {
  try {
    return await resource.mergePatch(namespace, name, body)
  } catch (err) {
    if (isHttpError(err, 404)) {
      return resource.create(namespace, body)
    }
    throw err
  }
}

function replaceIngressApiServer (client, { name = TERMINAL_KUBE_APISERVER, namespace, host, tlsHost, serviceName, ownerReferences, annotations, secretName }) {
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
          tlsHost
        ],
        secretName
      }
    ]
  }

  const body = toIngressResource({ name, annotations, spec, ownerReferences })

  return replaceResource(client.extensions.ingresses, { namespace, name, body })
}

function replaceEndpointKubeApiServer (client, { name = TERMINAL_KUBE_APISERVER, namespace, ip, ownerReferences }) {
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

  return replaceResource(client.core.endpoints, { namespace, name, body })
}

function replaceServiceKubeApiServer (client, { name = TERMINAL_KUBE_APISERVER, namespace, externalName = undefined, ownerReferences, clusterIP = 'None' }) {
  let type
  if (externalName) {
    type = 'ExternalName'
    clusterIP = undefined
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

  return replaceResource(client.core.services, { namespace, name, body })
}

async function handleSeed (seed) {
  const name = seed.metadata.name
  const namespace = 'garden'

  // get latest seed resource from cache
  seed = getSeed(name)

  if (!_.isEmpty(seed.metadata.deletionTimestamp)) {
    logger.debug(`Seed ${name} is marked for deletion, bootstrapping aborted`)
    return
  }

  logger.debug(`replacing resources on seed ${name} for webterminals`)

  // now make sure a browser-trusted certificate is presented for the kube-apiserver
  const shoot = await dashboardClient.getShoot({ namespace, name, throwNotFound: false })
  if (shoot) {
    await ensureTrustedCertForShootApiServer(dashboardClient, shoot)
  } else {
    await ensureTrustedCertForSeedApiServer(dashboardClient, seed)
  }
}

async function handleShoot (shoot) {
  const { metadata: { namespace, name } } = shoot
  logger.debug(`replacing shoot's apiserver ingress ${namespace}/${name} for webterminals`)
  // read the latest shoot resource version
  const latestShootResource = await dashboardClient['core.gardener.cloud'].shoots.get(namespace, name)
  await ensureTrustedCertForShootApiServer(dashboardClient, latestShootResource)
}

/*
  Currently the kube apiserver of a shoot presents a certificate signed by a custom CA root certificate which is usually not trusted by a browser.
  As for the web terminals, the frontend client opens a websocket connection directly to the kube apiserver. This requires a browser trusted certificate.
  Preferred, the gardener provides the kube-apiserver a browser trusted certificate using the `--tls-sni-cert-key` argument.
  Until this is the case we need to workaround this by creating an ingress (e.g. with the respective certmanager annotations) so that a proper certificate is presented for the kube-apiserver.
  https://github.com/gardener/gardener/issues/1413
*/
async function ensureTrustedCertForShootApiServer (client, shootResource) {
  const { metadata: { namespace, name } } = shootResource
  if (!_.isEmpty(shootResource.metadata.deletionTimestamp)) {
    logger.debug(`Shoot ${namespace}/${name} is marked for deletion, bootstrapping aborted`)
    return
  }

  // fetch seed resource
  const seedName = getSeedNameFromShoot(shootResource)
  const seedResource = await client['core.gardener.cloud'].seeds.get(seedName)

  // calculate ingress domain
  const apiServerIngressHost = getKubeApiServerHostForShoot(shootResource, seedResource)
  const seedWildcardIngressDomain = getWildcardIngressDomainForSeed(seedResource)

  const seedShootNamespace = _.get(shootResource, 'status.technicalID')
  if (!seedShootNamespace) {
    throw new Error(`could not get namespace on seed for shoot ${namespace}/${name}`)
  }

  // get seed client
  const seedClient = await client.createKubeconfigClient(seedResource.spec.secretRef)

  const serviceName = 'kube-apiserver'
  const annotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')
  await replaceIngressApiServer(seedClient, {
    namespace: seedShootNamespace,
    serviceName,
    host: apiServerIngressHost,
    tlsHost: seedWildcardIngressDomain,
    annotations
  })
}

/*
 Make sure a a browser-trusted certificate is presented for the kube-apiserver of the garden terminal host cluster.
 This cluster runs the terminal pods of garden operators for the (virtual) garden.
*/
async function ensureTrustedCertForGardenTerminalHostApiServer () {
  logger.debug('replacing resources on garden host cluster for webterminals')

  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { name, namespace } = await getGardenTerminalHostClusterSecretRef(dashboardClient)

      const hostClient = await dashboardClient.createKubeconfigClient({ name, namespace })

      const hostNamespace = getConfigValue('terminal.bootstrap.gardenTerminalHost.namespace', 'garden')
      const apiServerIngressHost = getConfigValue('terminal.gardenTerminalHost.apiServerIngressHost')
      const ingressAnnotations = getConfigValue('terminal.bootstrap.gardenTerminalHost.apiServerIngress.annotations')
      return ensureTrustedCertForApiServer(hostClient, {
        namespace: hostNamespace,
        name: 'garden-host-cluster-apiserver',
        apiServerIngressHost,
        tlsHost: apiServerIngressHost,
        ingressAnnotations
      })
    }
    default:
      throw new NotImplemented(`bootstrapping garden terminal host cluster for refType ${refType} not yet implemented`)
  }
}

async function ensureTrustedCertForSeedApiServer (client, seed) {
  const seedName = seed.metadata.name
  const namespace = 'garden'

  const seedClient = await client.createKubeconfigClient(seed.spec.secretRef)

  const apiServerIngressHost = getKubeApiServerHostForSeed(seed)
  const seedWildcardIngressDomain = getWildcardIngressDomainForSeed(seed)
  const ingressAnnotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')
  await ensureTrustedCertForApiServer(seedClient, {
    namespace,
    name: `${TERMINAL_KUBE_APISERVER}-${seedName}`,
    apiServerIngressHost,
    tlsHost: seedWildcardIngressDomain,
    ingressAnnotations
  })
}

async function ensureTrustedCertForApiServer (client, { namespace, name, apiServerIngressHost, tlsHost, ingressAnnotations }) {
  const apiServerHostname = client.cluster.server.hostname
  let service
  // replace headless service
  if (net.isIP(apiServerHostname) !== 0) {
    const ip = apiServerHostname
    await replaceEndpointKubeApiServer(client, { namespace, name, ip })

    service = await replaceServiceKubeApiServer(client, { namespace, name })
  } else {
    const externalName = apiServerHostname
    service = await replaceServiceKubeApiServer(client, { namespace, name, externalName })
  }
  const serviceName = service.metadata.name

  await replaceIngressApiServer(client, {
    name,
    namespace,
    serviceName,
    host: apiServerIngressHost,
    tlsHost,
    annotations: ingressAnnotations,
    secretName: `${name}-tls`
  })
}

function isTerminalBootstrapDisabled () {
  return _.get(config, 'terminal.bootstrap.disabled', true)
}

function isTerminalBootstrapDisabledForKind (kind) {
  kind = _.lowerFirst(kind) // lower first character (Shoot -> shoot)
  return _.get(config, `terminal.bootstrap.${kind}Disabled`, false)
}

function verifyRequiredConfigExists () {
  if (isTerminalBootstrapDisabled()) {
    logger.debug('terminal bootstrap disabled by config')
    return false // no further checks needed, bootstrapping is disabled
  }
  let requiredConfigs = [
    'terminal.bootstrap.apiServerIngress.annotations'
  ]
  if (!isTerminalBootstrapDisabledForKind('gardenTerminalHost')) {
    // bootstrapping of gardenTerminalHost only makes sense when using terminal.gardenTerminalHost.secretRef (for which default values exist)
    // for refType "secretRef", the apiServerIngressHost config is required as it cannot be determined automatically
    requiredConfigs = requiredConfigs.concat([
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

class Bootstrapper extends Queue {
  constructor () {
    super(Bootstrapper.process, Bootstrapper.options)
    this.bootstrapPending = new BootstrapPendingSet()
    this.requiredConfigExists = verifyRequiredConfigExists()
    if (this.isBootstrapKindAllowed('gardenTerminalHost')) {
      const description = 'garden host cluster'
      const handler = new Handler(ensureTrustedCertForGardenTerminalHostApiServer, description)
      this.push(handler)
    }
  }

  isBootstrapKindAllowed (kind) {
    if (isTerminalBootstrapDisabled()) {
      return false
    }
    if (isTerminalBootstrapDisabledForKind(kind)) {
      return false
    }
    if (!this.requiredConfigExists) {
      return false
    }
    return true
  }

  isResourcePending (resource) {
    return this.bootstrapPending.containsResource(resource)
  }

  removePendingResource (resource) {
    return this.bootstrapPending.removeResource(resource)
  }

  bootstrapResource (resource) {
    const kind = resource.kind
    if (!this.isBootstrapKindAllowed(kind)) {
      return
    }

    // do not bootstrap if resource is beeing deleted
    if (!_.isEmpty(resource.metadata.deletionTimestamp)) {
      return
    }

    const isBootstrapDisabledForResource = _.get(resource, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-disabled'], 'false') === 'true'
    if (isBootstrapDisabledForResource) {
      const name = resource.metadata.name
      const namespace = _.get(resource, 'metadata.namespace', '')
      logger.debug(`terminal bootstrap disabled for ${kind} ${namespace}/${name}`)
      return
    }

    // for shoots, if the seed-shoot-ns does not exist, postpone bootstrapping
    if (kind === 'Shoot' && !seedShootNamespaceExists(resource)) {
      if (this.bootstrapPending.containsResource(resource)) {
        return
      }
      const key = this.bootstrapPending.addResource(resource)
      logger.debug(`bootstrapping of ${key} postponed`)
      return
    }

    if (this.bootstrapPending.containsResource(resource)) {
      this.bootstrapPending.removeResource(resource)
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
    this.push(handler)
  }

  static get options () {
    return _
      .chain(config)
      .get('terminal.bootstrap.queueOptions', {})
      .cloneDeep()
      .value()
  }

  static async process (handler, cb) {
    try {
      await handler.run()
      cb(null, null)
    } catch (err) {
      logger.error(`failed to bootstrap ${handler.description}`, err)
      cb(err, null)
    }
  }
}

module.exports = {
  Handler,
  Bootstrapper
}
