
//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'
const Queue = require('better-queue')
const _ = require('lodash')
const hash = require('object-hash')
const net = require('net')

const logger = require('../../logger')
const config = require('../../config')
const { NotImplemented } = require('http-errors')

const { isHttpError } = require('@gardener-dashboard/request')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const {
  getShootRef
} = require('./utils')

const {
  getConfigValue,
  getSeedNameFromShoot,
  isSeedUnreachable,
  getSeedIngressDomain
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

const TERMINAL_KUBE_APISERVER = 'dashboard-terminal-kube-apiserver'

const BootstrapReasonEnum = {
  IRRELEVANT: 0,
  NOT_BOOTSTRAPPED: 1,
  REVISION_CHANGED: 2
}

const BootstrapStatusEnum = {
  INITIAL: 0,
  POSTPONED: 1,
  BOOTSTRAPPED: 2,
  IN_PROGRESS: 3,
  FAILED: 4
}

// acts as abstract class
class BootstrapMap extends Map {
  removeResource (resource) {
    const key = this.getKey(resource)
    this.delete(key)
  }

  addResource (resource, value = {}) {
    const key = this.getKey(resource)
    this.set(key, value)
    return key
  }

  setSucceeded (item, { revision }) {
    const key = this.getKey(item)
    const value = {
      state: BootstrapStatusEnum.BOOTSTRAPPED,
      revision
    }
    this.set(key, value)
  }

  setBootstrapRequired (item) {
    const key = this.getKey(item)
    const currentValue = this.getValue(key)
    const value = {
      state: BootstrapStatusEnum.INITIAL,
      revision: undefined, // reset revision
      failure: currentValue.failure // keep failure in case there is any
    }
    this.set(key, value)
  }

  setFailed (item, doNotRetry = false) {
    const key = this.getKey(item)
    const currentValue = this.getValue(key)
    const failureCounter = _.get(currentValue, 'failure.counter', 0)
    const value = {
      state: BootstrapStatusEnum.FAILED,
      revision: currentValue.revision, // keep previous revision, in case handleDependentShoots needs to be triggered
      failure: {
        date: new Date(),
        counter: failureCounter + 1,
        doNotRetry
      }
    }
    this.set(key, value)
  }

  setInProgress (item) {
    const key = this.getKey(item)
    const value = this.getValue(key)
    value.state = BootstrapStatusEnum.IN_PROGRESS
    this.set(key, value)
  }

  setPostponed (item) {
    const key = this.getKey(item)
    const value = this.getValue(key)
    value.state = BootstrapStatusEnum.POSTPONED
    this.set(key, value)
  }

  getValue (item) {
    const key = this.getKey(item)
    return this.get(key) || {
      state: BootstrapStatusEnum.INITIAL
    }
  }

  getKey (arg) {
    if (typeof arg === 'string') {
      return arg
    }

    const { metadata: { uid } } = arg
    return uid
  }
}

function taskIdForResource (resource) {
  const { metadata: { uid } } = resource
  return uid
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

class Handler {
  constructor (fn, { id, description } = {}) {
    this._run = fn
    this.id = id
    this._description = description
    this.session = {
      canceled: false
    }
  }

  run () {
    return this._run(this.session)
  }

  cancel () {
    logger.debug(`Cancel called on Handler ${this.description}`)
    this.session.canceled = true
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
                service: {
                  name: serviceName,
                  port: {
                    number: 443
                  }
                }
              },
              path: '/',
              pathType: 'Prefix'
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

  return replaceResource(client['networking.k8s.io'].ingresses, { namespace, name, body })
}

function replaceEndpointKubeApiServer (client, { name = TERMINAL_KUBE_APISERVER, namespace, ip, port, ownerReferences }) {
  const subsets = [
    {
      addresses: [
        {
          ip
        }
      ],
      ports: [
        {
          port,
          protocol: 'TCP'
        }
      ]
    }
  ]

  const body = toEndpointResource({ name, namespace, subsets, ownerReferences })

  return replaceResource(client.core.endpoints, { namespace, name, body })
}

function replaceServiceKubeApiServer (client, { name = TERMINAL_KUBE_APISERVER, namespace, externalName = undefined, ownerReferences, clusterIP = 'None', targetPort }) {
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
        targetPort
      }
    ],
    type, // optional
    externalName // optional
  }

  const body = toServiceResource({ name, namespace, spec, ownerReferences })

  return replaceResource(client.core.services, { namespace, name, body })
}

async function handleSeed (seed) {
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

  const managedSeed = await dashboardClient.getManagedSeed({ namespace: 'garden', name, throwNotFound: false })
  // now make sure a browser-trusted certificate is presented for the kube-apiserver
  if (managedSeed) {
    const shootRef = getShootRef(managedSeed)
    const shoot = await dashboardClient.getShoot(shootRef)
    const seedName = getSeedNameFromShoot(shoot)
    const seedForShoot = await dashboardClient['core.gardener.cloud'].seeds.get(seedName)
    await ensureTrustedCertForShootApiServer(dashboardClient, shoot, seedForShoot)
  } else {
    await ensureTrustedCertForSeedApiServer(dashboardClient, seed)
  }
}

async function handleShoot (shoot, seed) {
  const { metadata: { namespace, name } } = shoot
  logger.debug(`replacing shoot's apiserver ingress ${namespace}/${name} for webterminals`)
  await ensureTrustedCertForShootApiServer(dashboardClient, shoot, seed)
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
    await replaceEndpointKubeApiServer(client, { namespace, name, ip, port })

    service = await replaceServiceKubeApiServer(client, { namespace, name, targetPort: port })
  } else {
    const externalName = apiServerHostname
    service = await replaceServiceKubeApiServer(client, { namespace, name, externalName, targetPort: port })
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
    this.bootstrapState = new BootstrapMap()
    this.requiredConfigExists = verifyRequiredConfigExists()
    if (this.isBootstrapKindAllowed('gardenTerminalHost')) {
      const description = 'garden host cluster'
      const handler = new Handler(ensureTrustedCertForGardenTerminalHostApiServer, {
        id: 'gardenTerminalHost',
        description
      })
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

  handleResourceEvent ({ type, object }) {
    switch (type) {
      case 'ADDED': {
        this.bootstrapResource(object)
        break
      }
      case 'MODIFIED': {
        this.bootstrapResource(object)
        break
      }
      case 'DELETED': {
        this.cancelTask(object)

        this.bootstrapState.removeResource(object)
        break
      }
    }
  }

  cancelTask (resource) {
    const taskId = taskIdForResource(resource)
    this.cancel(taskId)
  }

  bootstrapStatus (resource) {
    const { kind, metadata: { namespace, name, uid } } = resource

    const qualifiedName = namespace ? namespace + '/' + name : name
    const description = `${kind} - ${qualifiedName} (${uid})`

    if (!this.isBootstrapKindAllowed(kind)) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    // do not bootstrap if resource is being deleted
    if (!_.isEmpty(resource.metadata.deletionTimestamp)) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    const isBootstrapDisabledForResource = _.get(resource, ['metadata', 'annotations', 'dashboard.gardener.cloud/terminal-bootstrap-disabled'], 'false') === 'true'
    if (isBootstrapDisabledForResource) {
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    const value = this.bootstrapState.getValue(resource)

    if (value.state === BootstrapStatusEnum.IN_PROGRESS) { // task already running or in queue, can ignore
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    if (value.failure) { // failed previously
      if (value.failure.doNotRetry) {
        return {
          required: false,
          reason: BootstrapReasonEnum.IRRELEVANT
        }
      }

      const lastFailure = value.failure.date.getTime()
      const multiplier = Math.min(value.failure.counter * 2, 24)
      const needsWait = Date.now() - lastFailure <= multiplier * 60 * 60 * 1000
      if (needsWait) {
        return {
          required: false,
          reason: BootstrapReasonEnum.IRRELEVANT
        }
      }
    }

    // for shoots, if the seed-shoot-ns does not exist, postpone bootstrapping
    if (kind === 'Shoot' && !seedShootNamespaceExists(resource)) {
      if (value.state === BootstrapStatusEnum.INITIAL) {
        logger.debug(`bootstrapping of ${description} postponed`)
        this.bootstrapState.setPostponed(resource)
      }
      return {
        required: false,
        reason: BootstrapReasonEnum.IRRELEVANT
      }
    }

    if (!value.revision) { // not yet bootstrapped
      return {
        required: true,
        reason: BootstrapReasonEnum.NOT_BOOTSTRAPPED
      }
    }

    if (kind === 'Seed') {
      if (value.revision !== bootstrapRevision(resource)) { // revision changed
        logger.debug(`terminal bootstrap revision changed for ${description}. Needs bootstrap`)
        return {
          required: true,
          reason: BootstrapReasonEnum.REVISION_CHANGED
        }
      }
    }

    // already bootstrapped
    return {
      required: false,
      reason: BootstrapReasonEnum.IRRELEVANT
    }
  }

  bootstrapResource (resource) {
    const { kind, metadata: { namespace, name, uid } } = resource

    const qualifiedName = namespace ? namespace + '/' + name : name
    const description = `${kind} - ${qualifiedName} (${uid})`

    const { required, reason } = this.bootstrapStatus(resource)
    if (!required) {
      return
    }

    const key = this.bootstrapState.getKey(resource)
    this.bootstrapState.setInProgress(key)

    const taskId = taskIdForResource(resource)
    const fn = async session => {
      try {
        if (session.canceled) {
          logger.debug(`Canceling handler of ${description} as requested`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
          return
        }

        let seed
        switch (kind) {
          case 'Seed': {
            seed = await dashboardClient['core.gardener.cloud'].seeds.get(name)
            await handleSeed(seed)
            if (reason === BootstrapReasonEnum.REVISION_CHANGED) {
              await this.handleDependentShoots(name)
            }
            break
          }
          case 'Shoot': {
            const shoot = await dashboardClient['core.gardener.cloud'].shoots.get(namespace, name)
            const seedName = getSeedNameFromShoot(shoot)
            seed = await dashboardClient['core.gardener.cloud'].seeds.get(seedName)
            await handleShoot(shoot, seed)
            break
          }
          default: {
            logger.error(`can't bootstrap unsupported kind ${kind}`)
            this.bootstrapState.setFailed(key, true)
            return
          }
        }

        if (session.canceled) { // do not add key to the bootstrapped set when the session is canceled (due to shoot deletion) to prevent leaking memory
          logger.debug(`Canceling handler of ${description} as requested after handling resource`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
          return
        }

        logger.debug(`Successfully bootstrapped ${description}`)
        const revision = bootstrapRevision(seed)
        this.bootstrapState.setSucceeded(key, { revision })
      } catch (err) {
        if (session.canceled) { // do not add key to the bootstrapped set when the session is canceled (due to shoot deletion) to prevent leaking memory
          logger.debug(`Handler canceled of ${description}`)
          this.bootstrapState.delete(key) // tasks are canceled only for deleted resources, hence remove from state
        } else {
          this.bootstrapState.setFailed(key)
        }
        throw err
      }
    }
    const handler = new Handler(fn, {
      id: taskId, // with the id we make sure that the task for one shoot is not added multiple times (e.g. on another ADDED event when the shoot watch is re-established)
      description
    })

    this.push(handler)
  }

  async handleDependentShoots (seedName) {
    const query = {
      fieldSelector: `spec.seedName=${seedName}`
    }
    const { items } = await dashboardClient['core.gardener.cloud'].shoots.listAllNamespaces(query)
    logger.debug(`Bootstrap required for ${items.length} shoots due to terminal bootstrap revision change`)
    _.forEach(items, shoot => {
      shoot.kind = 'Shoot' // patch missing kind
      this.bootstrapState.setBootstrapRequired(shoot)
      this.bootstrapResource(shoot)
    })
  }

  static get options () {
    const defaultOptions = {
      maxTimeout: 600000 // 10 minutes
    }
    const configOptions = _
      .chain(config)
      .get('terminal.bootstrap.queueOptions', {})
      .cloneDeep()
      .value()
    return _.assign(defaultOptions, configOptions)
  }

  static process (handler, cb) {
    (async () => {
      try {
        await handler.run()
        cb(null, null)
      } catch (err) {
        logger.error(`failed to bootstrap ${handler.description}`, err)
        cb(err, null)
      }
    })()
    return handler // handler implements cancel function
  }
}

module.exports = {
  Handler,
  Bootstrapper,
  BootstrapStatusEnum
}
