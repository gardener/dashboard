
//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const net = require('net')
const _ = require('lodash')
const fnv = require('fnv-plus')
const hash = require('object-hash')
const { NotImplemented } = require('http-errors')

const logger = require('../logger')
const config = require('../config')
const cache = require('../cache')

const {
  TERMINAL_KUBE_APISERVER,
  replaceIngressApiServer,
  replaceServiceApiServer,
  replaceEndpointApiServer
} = require('./resources')

const GardenTerminalHostRefType = {
  SECRET_REF: 'secretRef',
  SEED_REF: 'seedRef',
  SHOOT_REF: 'shootRef'
}

function getConfigValue (path, defaultValue) {
  const value = _.get(config, path, defaultValue)
  if (arguments.length === 1 && typeof value === 'undefined') {
    assert.fail(`no config with ${path} found`)
  }
  return value
}

function getSeedNameFromShoot (shoot) {
  const seedName = shoot.spec?.seedName
  assert.ok(seedName, 'There is no seed assigned to this shoot (yet)')
  return seedName
}

function getSeedIngressDomain (seed) {
  return _.get(seed, 'spec.dns.ingressDomain') || _.get(seed, 'spec.ingress.domain')
}

function isSeedUnreachable (seed) {
  const matchLabels = _.get(config, 'unreachableSeeds.matchLabels')
  if (!matchLabels) {
    return false
  }
  return _.isMatch(seed, { metadata: { labels: matchLabels } })
}

function getKubeApiServerHostForShoot (shoot, seed) {
  if (!seed) {
    seed = cache.getSeed(getSeedNameFromShoot(shoot))
  }
  const { namespace, name } = shoot.metadata
  const hash = fnv.hash(`${name}.${namespace}`, 32).str()
  const ingressDomain = getSeedIngressDomain(seed)
  return `k-${hash}.${ingressDomain}`
}

function getKubeApiServerHostForSeed (seed) {
  const ingressDomain = getSeedIngressDomain(seed)
  return `k-g.${ingressDomain}`
}

function getWildcardIngressDomainForSeed (seed) {
  const ingressDomain = getSeedIngressDomain(seed)
  return `*.${ingressDomain}`
}

/*
  Returns the secretRef for the cluster, that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterSecretRef (client) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { items: runtimeSecrets } = await getGardenTerminalHostClusterSecrets(client)
      const secret = _.head(runtimeSecrets)
      return {
        namespace: secret.metadata.namespace,
        name: secret.metadata.name
      }
    }
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      return _.get(seed, 'spec.secretRef')
    }
    case GardenTerminalHostRefType.SHOOT_REF: { // TODO refactor to return shootRef instead. The static kubeconfig might be disabled
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      return {
        namespace: getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden'),
        name: `${shootName}.kubeconfig`
      }
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

function getGardenTerminalHostClusterRefType () {
  return _
    .chain(getConfigValue('terminal.gardenTerminalHost'))
    .keys()
    .intersection(['secretRef', 'seedRef', 'shootRef'])
    .head()
    .value()
}

function getGardenTerminalHostClusterSecrets (client) {
  const namespace = getConfigValue('terminal.gardenTerminalHost.secretRef.namespace', 'garden')
  assert.ok(namespace, 'namespace must be set')
  const labelSelector = getConfigValue('terminal.gardenTerminalHost.secretRef.labelSelector', ['runtime=gardenTerminalHost'])
  const query = {
    labelSelector: labelSelector.join(',')
  }
  return client.core.secrets.list(namespace, query)
}

function getSeedForGardenTerminalHostCluster () {
  const seedName = getConfigValue('terminal.gardenTerminalHost.seedRef')
  const seed = cache.getSeed(seedName)
  if (!seed) {
    throw new Error(`There is no seed with name ${seedName}`)
  }
  return seed
}

function getShootRef (managedSeed) {
  return {
    namespace: managedSeed.metadata.namespace,
    name: managedSeed.spec.shoot.name
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

async function handleSeed (client, seed) {
  const { metadata: { name, deletionTimestamp } } = seed

  if (deletionTimestamp) {
    logger.debug(`Seed ${name} is marked for deletion, bootstrapping aborted`)
    return
  }
  if (isSeedUnreachable(seed)) {
    logger.debug(`Seed ${name} is not reachable from the dashboard, bootstrapping aborted`)
    return
  }

  logger.debug(`replacing resources on seed ${name} for webterminals`)

  const managedSeed = await client.getManagedSeed({ namespace: 'garden', name, throwNotFound: false })
  // now make sure a browser-trusted certificate is presented for the kube-apiserver
  if (managedSeed) {
    const shootRef = getShootRef(managedSeed)
    const shoot = await client.getShoot(shootRef)
    const seedName = getSeedNameFromShoot(shoot)
    const seedForShoot = await client['core.gardener.cloud'].seeds.get(seedName)
    await ensureTrustedCertForShootApiServer(client, shoot, seedForShoot)
  } else {
    await ensureTrustedCertForSeedApiServer(client, seed)
  }
}

async function handleShoot (client, shoot, seed) {
  const { metadata: { namespace, name } } = shoot
  logger.debug(`replacing shoot's apiserver ingress ${namespace}/${name} for webterminals`)
  await ensureTrustedCertForShootApiServer(client, shoot, seed)
}

/*
  Currently the kube apiserver of a shoot presents a certificate signed by a custom CA root certificate which is usually not trusted by a browser.
  As for the web terminals, the frontend client opens a websocket connection directly to the kube apiserver. This requires a browser trusted certificate.
  Preferred, the gardener provides the kube-apiserver a browser trusted certificate using the `--tls-sni-cert-key` argument.
  Until this is the case we need to workaround this by creating an ingress (e.g. with the respective certmanager annotations) so that a proper certificate is presented for the kube-apiserver.
  https://github.com/gardener/gardener/issues/1413
*/
async function ensureTrustedCertForShootApiServer (client, shootResource, seedResource) {
  const { metadata: { namespace, name, deletionTimestamp } } = shootResource
  if (deletionTimestamp) {
    logger.debug(`Shoot ${namespace}/${name} is marked for deletion, bootstrapping aborted`)
    return
  }

  const seedName = seedResource.metadata.name

  if (isSeedUnreachable(seedResource)) {
    logger.debug(`Seed ${seedName} is not reachable from the dashboard for shoot ${namespace}/${name}, bootstrapping aborted`)
    return
  }

  let seedClient

  const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seedName, throwNotFound: false })
  if (managedSeed) {
    const shootRef = getShootRef(managedSeed)
    seedClient = await client.createShootAdminKubeconfigClient(shootRef)
  } else {
    if (!seedResource.spec.secretRef) {
      logger.info(`Bootstrapping Shoot ${namespace}/${name} aborted as 'spec.secretRef' on the seed is missing.`)
      return
    }
    seedClient = await client.createKubeconfigClient(seedResource.spec.secretRef)
  }

  // calculate ingress domain
  const apiServerIngressHost = getKubeApiServerHostForShoot(shootResource, seedResource)
  const seedWildcardIngressDomain = getWildcardIngressDomainForSeed(seedResource)

  const seedShootNamespace = _.get(shootResource, 'status.technicalID')
  if (!seedShootNamespace) {
    throw new Error(`could not get namespace on seed for shoot ${namespace}/${name}`)
  }

  const serviceName = 'kube-apiserver'
  const annotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')

  const ingressClass = _.get(seedResource, 'metadata.annotations["seed.gardener.cloud/ingress-class"]')
  if (ingressClass && annotations) {
    annotations['kubernetes.io/ingress.class'] = ingressClass
  }

  await replaceIngressApiServer(seedClient, {
    name: TERMINAL_KUBE_APISERVER,
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
async function ensureTrustedCertForGardenTerminalHostApiServer (client) {
  logger.debug('replacing resources on garden host cluster for webterminals')

  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { name, namespace } = await getGardenTerminalHostClusterSecretRef(client)

      const hostClient = await client.createKubeconfigClient({ name, namespace })
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

  if (!seed.spec.secretRef) {
    logger.info(`Bootstrapping Seed ${seedName} aborted as 'spec.secretRef' on the seed is missing`)
    return
  }

  const seedClient = await client.createKubeconfigClient(seed.spec.secretRef)

  const apiServerIngressHost = getKubeApiServerHostForSeed(seed)
  const seedWildcardIngressDomain = getWildcardIngressDomainForSeed(seed)
  const ingressAnnotations = _.get(config, 'terminal.bootstrap.apiServerIngress.annotations')

  const ingressClass = _.get(seed, 'metadata.annotations["seed.gardener.cloud/ingress-class"]')
  if (ingressClass && ingressAnnotations) {
    ingressAnnotations['kubernetes.io/ingress.class'] = ingressClass
  }

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

  let port = parseInt(client.cluster.server.port)
  if (isNaN(port)) {
    port = 443
  }

  let service
  // replace headless service
  if (net.isIP(apiServerHostname) !== 0) {
    const ip = apiServerHostname
    await replaceEndpointApiServer(client, { namespace, name, ip, port })

    service = await replaceServiceApiServer(client, { namespace, name, targetPort: port })
  } else {
    const externalName = apiServerHostname
    service = await replaceServiceApiServer(client, { namespace, name, externalName, targetPort: port })
  }
  const serviceName = service.metadata.name

  await replaceIngressApiServer(client, {
    namespace,
    name,
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
  const requiredConfigs = [
    'terminal.bootstrap.apiServerIngress.annotations'
  ]
  if (!isTerminalBootstrapDisabledForKind('gardenTerminalHost')) {
    // bootstrapping of gardenTerminalHost only makes sense when using terminal.gardenTerminalHost.secretRef (for which default values exist)
    // for refType "secretRef", the apiServerIngressHost config is required as it cannot be determined automatically
    requiredConfigs.push(...[
      'terminal.gardenTerminalHost.apiServerIngressHost',
      'terminal.bootstrap.gardenTerminalHost.apiServerIngress.annotations'
    ])
  }

  for (const requiredConfig of requiredConfigs) {
    const value = _.get(config, requiredConfig)
    if (_.isEmpty(value)) {
      logger.error(`required terminal config '${requiredConfig}' not found`)
      return false
    }
  }
  return true
}

function taskIdForResource (resource) {
  return resource.metadata.uid
}

function bootstrapRevision (seed) {
  if (!seed) {
    return
  }

  const ingressClass = _.get(seed, 'metadata.annotations["seed.gardener.cloud/ingress-class"]')
  const ingressDomain = getSeedIngressDomain(seed)
  const trigger = _.get(seed, 'metadata.annotations["dashboard.gardener.cloud/terminal-bootstrap-trigger"]')

  const revisionObj = {
    ingressClass,
    ingressDomain,
    trigger
  }

  return hash(revisionObj)
}

module.exports = {
  getConfigValue,
  getSeedNameFromShoot,
  isSeedUnreachable,
  getSeedIngressDomain,
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  getKubeApiServerHostForSeed,
  getKubeApiServerHostForShoot,
  getWildcardIngressDomainForSeed,
  getShootRef,
  seedShootNamespaceExists,
  handleSeed,
  handleShoot,
  ensureTrustedCertForApiServer,
  ensureTrustedCertForShootApiServer,
  ensureTrustedCertForSeedApiServer,
  ensureTrustedCertForGardenTerminalHostApiServer,
  isTerminalBootstrapDisabled,
  isTerminalBootstrapDisabledForKind,
  verifyRequiredConfigExists,
  taskIdForResource,
  bootstrapRevision,
  GardenTerminalHostRefType
}
