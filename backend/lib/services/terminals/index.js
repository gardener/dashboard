//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const hash = require('object-hash')
const yaml = require('js-yaml')
const config = require('../../config')

const { Forbidden, UnprocessableEntity } = require('http-errors')
const { isHttpError } = require('@gardener-dashboard/request')

const {
  decodeBase64,
  getConfigValue,
  getSeedNameFromShoot
} = require('../../utils')

const {
  toTerminalResource,
  fromNodeResource
} = require('./terminalResources')

const {
  getKubeApiServerHostForSeedOrShootedSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterSecretRef,
  getGardenHostClusterKubeApiServer
} = require('./utils')

const {
  Bootstrapper
} = require('./terminalBootstrap')

const { getSeed, findProjectByNamespace } = require('../../cache')
const logger = require('../../logger')
const markdown = require('../../markdown')

const TERMINAL_CONTAINER_NAME = 'terminal'

const TargetEnum = {
  GARDEN: 'garden',
  CONTROL_PLANE: 'cp',
  SHOOT: 'shoot'
}

const converter = exports.converter = markdown.createConverter()

exports.create = function ({ user, body }) {
  const { coordinate: { namespace, name, target } } = body
  return getOrCreateTerminalSession({ user, namespace, name, target, body })
}

exports.config = async function ({ user, body: { coordinate: { namespace, name, target } } }) {
  return getTerminalConfig({ user, namespace, name, target })
}

exports.list = function ({ user, body: { coordinate: { namespace } } }) {
  return listTerminalSessions({ user, namespace })
}

exports.remove = function ({ user, body = {} }) {
  return deleteTerminalSession({ user, body })
}

exports.fetch = function ({ user, body = {} }) {
  return fetchTerminalSession({ user, body })
}

exports.heartbeat = async function ({ user, body = {} }) {
  return heartbeatTerminalSession({ user, body })
}

exports.listProjectTerminalShortcuts = async function ({ user, body = {} }) {
  const { coordinate: { namespace } } = body
  return listShortcuts({ user, namespace })
}

function toTerminalMetadata (terminal) {
  const metadata = _.pick(terminal.metadata, ['name', 'namespace'])
  metadata.identifier = _.get(terminal, 'metadata.annotations["dashboard.gardener.cloud/identifier"]')
  return metadata
}

function imageHelpText (terminal) {
  const containerImage = _.get(terminal, 'spec.host.pod.container.image')
  const containerImageDescriptions = getConfigValue('terminal.containerImageDescriptions', [])
  const containerImageDescription = findImageDescription(containerImage, containerImageDescriptions)
  return converter.makeSanitizedHtml(containerImageDescription)
}

function findImageDescription (containerImage, containerImageDescriptions) {
  return _
    .chain(containerImageDescriptions)
    .find(({ image }) => {
      if (_.startsWith(image, '/') && _.endsWith(image, '/')) {
        image = image.substring(1, image.length - 1)
        return new RegExp(image).test(containerImage)
      }
      return image === containerImage
    })
    .get('description')
    .value()
}
// exported for unit test
exports.findImageDescription = findImageDescription

async function readServiceAccountToken (client, { namespace, serviceAccountName }) {
  const serviceAccount = await client.core.serviceaccounts
    .watch(namespace, serviceAccountName)
    .waitFor(isServiceAccountReady, { timeout: 10 * 1000 })
  const secretName = getFirstServiceAccountSecret(serviceAccount)
  if (secretName) {
    const secret = await client.core.secrets.get(namespace, secretName)
    return decodeBase64(secret.data.token)
  }
}

function getFirstServiceAccountSecret (serviceAccount) {
  return _
    .chain(serviceAccount)
    .get('secrets')
    .first()
    .get('name')
    .value()
}

function isServiceAccountReady (serviceAccount) {
  return !_.isEmpty(getFirstServiceAccountSecret(serviceAccount))
}

async function listTerminals ({ user, namespace, identifier }) {
  const username = user.id
  const client = user.client

  const selectors = [
    `dashboard.gardener.cloud/created-by-hash=${hash(username)}`
  ]
  if (identifier) {
    selectors.push(`dashboard.gardener.cloud/identifier-hash=${hash(identifier)}`)
  }
  const query = {
    labelSelector: selectors.join(',')
  }

  const terminals = await client['dashboard.gardener.cloud'].terminals.list(namespace, query)
  return _
    .chain(terminals)
    .get('items')
    .filter(terminal => _.isEmpty(terminal.metadata.deletionTimestamp))
    .filter(['metadata.annotations["gardener.cloud/created-by"]', username])
    .value()
}

async function findExistingTerminalResource ({ user, namespace, body }) {
  const { identifier } = body

  const existingTerminalList = await listTerminals({ user, namespace, identifier })
  return _.first(existingTerminalList)
}

async function deleteTerminalSession ({ user, body }) {
  const username = user.id
  const client = user.client

  const { namespace, name } = body

  try {
    const terminal = await getTerminalResource(client, { namespace, name })
    if (terminal.metadata.annotations['gardener.cloud/created-by'] !== username) {
      throw new Forbidden(`You are not allowed to delete terminal with name ${name}`)
    }
    await client['dashboard.gardener.cloud'].terminals.delete(namespace, name)
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }
  return { namespace, name }
}

function getShootResource ({ user, namespace, name, target }) {
  const client = user.client
  if (target === TargetEnum.GARDEN) {
    return
  }
  return client.getShoot({ namespace, name })
}

async function getTargetCluster ({ user, namespace, name, target, preferredHost, shootResource }) {
  const client = user.client
  const isAdmin = user.isAdmin

  const targetCluster = {
    kubeconfigContextNamespace: undefined,
    namespace: undefined, // this is the namespace where the "access" service account will be created
    credentials: undefined,
    authorization: {
      roleBindings: undefined,
      projectMemberships: undefined
    },
    apiServer: undefined
  }

  switch (target) {
    case TargetEnum.GARDEN: {
      targetCluster.kubeconfigContextNamespace = namespace
      if (isAdmin) {
        targetCluster.namespace = 'garden'
        targetCluster.credentials = getConfigValue('terminal.garden.operatorCredentials')
        targetCluster.authorization.roleBindings = [
          {
            roleRef: {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'ClusterRole',
              name: 'cluster-admin'
            },
            bindingKind: 'ClusterRoleBinding'
          }
        ]
      } else {
        const projectName = findProjectByNamespace(namespace).metadata.name
        targetCluster.namespace = namespace
        const serviceAccountName = 'dashboard-webterminal'

        // test if service account exists
        await client.core.serviceaccounts.get(namespace, serviceAccountName)

        targetCluster.credentials = {
          serviceAccountRef: {
            name: serviceAccountName,
            namespace
          }
        }
        targetCluster.authorization.projectMemberships = [
          {
            projectName,
            roles: [
              'admin'
            ]
          }
        ]
        targetCluster.apiServer = {
          server: config.apiServerUrl
        }
      }

      break
    }
    case TargetEnum.SHOOT: {
      targetCluster.apiServer = { serviceRef: {} }
      if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluser is the seed
        targetCluster.apiServer.serviceRef.name = 'kube-apiserver'
      } else {
        targetCluster.apiServer.serviceRef.name = 'kubernetes'
        targetCluster.apiServer.serviceRef.namespace = 'default'
      }

      targetCluster.kubeconfigContextNamespace = 'default'
      targetCluster.namespace = undefined // this will create a temporary namespace
      targetCluster.credentials = {
        secretRef: {
          name: `${name}.kubeconfig`,
          namespace
        }
      }
      targetCluster.authorization.roleBindings = [
        {
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'cluster-admin'
          },
          bindingKind: 'ClusterRoleBinding'
        }
      ]
      break
    }
    case TargetEnum.CONTROL_PLANE: {
      if (!shootResource) {
        shootResource = await client.getShoot({ namespace, name })
      }
      const seedShootNamespace = getSeedShootNamespace(shootResource)
      const seedName = getSeedNameFromShoot(shootResource)
      const seed = getSeed(seedName)

      targetCluster.kubeconfigContextNamespace = seedShootNamespace
      targetCluster.namespace = seedShootNamespace
      targetCluster.credentials = {
        secretRef: _.get(seed, 'spec.secretRef')
      }
      targetCluster.authorization.roleBindings = [
        {
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'cluster-admin'
          },
          bindingKind: 'RoleBinding'
        }
      ]
      break
    }
    default: {
      throw new Error(`unknown target ${target}`)
    }
  }
  return targetCluster
}

async function getGardenTerminalHostCluster (client, { body }) {
  const hostCluster = {}
  hostCluster.config = getContainerConfigFromBody(body)

  const [
    secretRef,
    kubeApiServer
  ] = await Promise.all([
    await getGardenTerminalHostClusterSecretRef(client),
    await getGardenHostClusterKubeApiServer(client)
  ])

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = secretRef
  hostCluster.kubeApiServer = kubeApiServer
  return hostCluster
}

async function getSeedHostCluster (client, { namespace, name, target, body, shootResource }) {
  const hostCluster = {}
  hostCluster.config = getContainerConfigFromBody(body)
  if (!shootResource) {
    shootResource = await client.getShoot({ namespace, name })
  }
  if (target === TargetEnum.SHOOT) {
    hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)
  }

  const seedShootNamespace = getSeedShootNamespace(shootResource)
  const seedName = getSeedNameFromShoot(shootResource)

  const seed = getSeed(seedName)

  hostCluster.namespace = seedShootNamespace
  hostCluster.secretRef = _.get(seed, 'spec.secretRef')
  hostCluster.kubeApiServer = await getKubeApiServerHostForSeedOrShootedSeed(client, seed)
  return hostCluster
}

async function getShootHostCluster (client, { namespace, name, target, body, shootResource }) {
  const hostCluster = {}
  hostCluster.config = getConfigFromBody(body)

  if (!shootResource) {
    shootResource = await client.getShoot({ namespace, name })
  }
  hostCluster.isHostOrTargetHibernated = _.get(shootResource, 'spec.hibernation.enabled', false)

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.secretRef = {
    namespace,
    name: `${name}.kubeconfig`
  }
  hostCluster.kubeApiServer = await getKubeApiServerHostForShoot(shootResource)
  return hostCluster
}

function getContainerConfigFromBody ({ container }) {
  return {
    container: _.pick(container, ['image', 'command', 'args'])
  }
}

function getConfigFromBody (body) {
  const config = _.pick(body, ['node', 'privileged', 'hostPID', 'hostNetwork', 'container'])
  config.container = _.pick(config.container, ['image', 'command', 'args'])
  return config
}

function getPreferredHost ({ user, body }) {
  const defaultHost = user.isAdmin ? 'seed' : 'shoot'
  return _.get(body, 'preferredHost', defaultHost)
}

function getHostCluster ({ user, namespace, name, target, preferredHost, body, shootResource }) {
  const client = user.client

  if (target === TargetEnum.GARDEN && user.isAdmin) {
    return getGardenTerminalHostCluster(client, { body })
  }

  if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluser is the seed
    return getSeedHostCluster(client, { namespace, name, target, body, shootResource })
  }

  // host cluster is the shoot
  return getShootHostCluster(client, { namespace, name, target, body, shootResource })
}

async function createTerminal ({ user, namespace, target, hostCluster, targetCluster, identifier, preferredHost }) {
  const client = user.client
  const isAdmin = user.isAdmin
  const image = getContainerImage({ isAdmin, preferredImage: hostCluster.config.container.image })
  _.set(hostCluster, 'config.container.image', image)

  const podLabels = getPodLabels(target)

  const terminalHost = createHost({ ...hostCluster.config, namespace: hostCluster.namespace, secretRef: hostCluster.secretRef, podLabels })
  const terminalTarget = createTarget({ ...targetCluster })

  const labels = {
    'dashboard.gardener.cloud/created-by-hash': hash(user.id)
  }
  if (identifier) {
    labels['dashboard.gardener.cloud/identifier-hash'] = hash(identifier)
  }

  const annotations = {
    'dashboard.gardener.cloud/identifier': identifier,
    'dashboard.gardener.cloud/preferredHost': preferredHost
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, annotations, labels, host: terminalHost, target: terminalTarget })

  return client['dashboard.gardener.cloud'].terminals.create(namespace, terminalResource)
}

function getPodLabels (target) {
  let labels = {
    'networking.gardener.cloud/to-dns': 'allowed',
    'networking.gardener.cloud/to-public-networks': 'allowed',
    'networking.gardener.cloud/to-private-networks': 'allowed'
  }
  switch (target) {
    case TargetEnum.GARDEN:
      labels = {} // no network restrictions for now
      break
    case TargetEnum.CONTROL_PLANE:
      labels['networking.gardener.cloud/to-seed-apiserver'] = 'allowed'
      break
    case TargetEnum.SHOOT:
      labels['networking.gardener.cloud/to-shoot-apiserver'] = 'allowed'
      labels['networking.gardener.cloud/to-shoot-networks'] = 'allowed'
      break
  }
  return labels
}

function createHost ({ secretRef, namespace, container, podLabels, node, hostPID = false, hostNetwork = false }) {
  const temporaryNamespace = _.isEmpty(namespace)
  const {
    image,
    command,
    args,
    privileged = false
  } = container
  const host = {
    credentials: {
      secretRef
    },
    namespace,
    temporaryNamespace,
    pod: {
      labels: podLabels,
      container: {
        image,
        command,
        args,
        privileged
      },
      hostPID,
      hostNetwork
    }
  }
  if (node) {
    host.pod.nodeSelector = {
      'kubernetes.io/hostname': node
    }
  }
  return host
}

function createTarget ({ kubeconfigContextNamespace, apiServer, credentials, authorization, namespace }) {
  const temporaryNamespace = _.isEmpty(namespace)
  return {
    credentials,
    kubeconfigContextNamespace,
    apiServer,
    authorization,
    namespace,
    temporaryNamespace
  }
}

function readTerminalUntilReady ({ user, namespace, name }) {
  const username = user.id
  const client = user.client

  const isTerminalReady = terminal => {
    if (terminal.metadata.annotations['gardener.cloud/created-by'] !== username) {
      throw new Forbidden('You are not the user who created the terminal resource')
    }
    const podName = _.get(terminal, 'status.podName')
    const attachServiceAccountName = _.get(terminal, 'status.attachServiceAccountName')
    return podName && attachServiceAccountName
  }
  return client['dashboard.gardener.cloud'].terminals
    .watch(namespace, name)
    .waitFor(isTerminalReady, { timeout: 10 * 1000 })
}

async function getOrCreateTerminalSession ({ user, namespace, name, target, body = {} }) {
  const username = user.id
  const client = user.client

  let [
    terminal,
    shootResource
  ] = await Promise.all([
    findExistingTerminalResource({ user, namespace, body }),
    getShootResource({ user, namespace, name, target })
  ])

  const preferredHost = _.get(terminal, 'metadata.annotations["dashboard.gardener.cloud/preferredHost"]', getPreferredHost({ user, body }))

  const [
    hostCluster,
    targetCluster
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, preferredHost, body, shootResource }),
    getTargetCluster({ user, namespace, name, target, preferredHost, shootResource })
  ])

  if (hostCluster.isHostOrTargetHibernated) {
    throw new Error('Hosting cluster or target cluster is hibernated')
  }

  try {
    await client.getKubeconfig(hostCluster.secretRef)
  } catch (err) {
    throw new Error('Host kubeconfig does not exist (yet)')
  }

  if (!terminal) {
    logger.debug(`No terminal found for user ${username}. Creating new..`)
    const { identifier } = body
    terminal = await createTerminal({ user, namespace, target, hostCluster, targetCluster, identifier, preferredHost })
  } else {
    logger.debug(`Found terminal for user ${username}: ${terminal.metadata.name}`)
    // do not wait for keepalive to return - run in parallel
    setKeepaliveAnnotation(client, terminal)
      .catch(_.noop) // ignore error
  }

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      kubeApiServer: hostCluster.kubeApiServer,
      namespace: terminal.spec.host.namespace
    },
    imageHelpText: imageHelpText(terminal)
  }
}

async function createHostClient (client, secretRef) {
  try {
    return await client.createKubeconfigClient(secretRef)
  } catch (err) {
    if (isHttpError(err, 404)) {
      throw new Error('Host kubeconfig does not exist (yet)')
    }
    const { namespace, name } = secretRef
    logger.error(`Failed to create client from kubeconfig secret ${namespace}/${name}`, err)
    throw err
  }
}

async function fetchTerminalSession ({ user, body: { name, namespace } }) {
  const client = user.client

  const terminal = await readTerminalUntilReady({ user, name, namespace })
  const host = terminal.spec.host
  const hostClient = await createHostClient(client, host.credentials.secretRef)
  const token = await readServiceAccountToken(hostClient, {
    namespace: host.namespace,
    serviceAccountName: terminal.status.attachServiceAccountName
  })

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      token,
      pod: {
        name: terminal.status.podName,
        container: TERMINAL_CONTAINER_NAME
      }
    }
  }
}

async function listTerminalSessions ({ user, namespace }) {
  const terminals = await listTerminals({ user, namespace })

  return _.map(terminals, terminal => {
    return {
      metadata: toTerminalMetadata(terminal)
    }
  })
}

function getSeedShootNamespace (shoot) {
  const seedShootNamespace = _.get(shoot, 'status.technicalID')
  if (_.isEmpty(seedShootNamespace)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNamespace
}

function ensureTerminalAllowed ({ method, isAdmin, body }) {
  if (isAdmin) {
    return
  }

  // whitelist methods for terminal sessions for everybody
  if (_.includes(['list', 'fetch', 'config', 'remove', 'heartbeat', 'listProjectTerminalShortcuts'], method)) {
    return
  }

  const { coordinate: { target } } = body

  // non-admin users are only allowed to open terminals for shoots and the garden cluster
  if (target === TargetEnum.SHOOT || target === TargetEnum.GARDEN) {
    return
  }
  throw new Forbidden('Terminal usage is not allowed')
}
exports.ensureTerminalAllowed = ensureTerminalAllowed

function getContainerImage ({ isAdmin, preferredImage }) {
  if (preferredImage) {
    return preferredImage
  }

  const containerImage = getConfigValue('terminal.container.image')
  if (isAdmin) {
    return getConfigValue('terminal.containerOperator.image', containerImage)
  }
  return containerImage
}

async function heartbeatTerminalSession ({ user, body }) {
  const username = user.id
  const client = user.client

  const { name, namespace } = body
  const terminal = await getTerminalResource(client, { name, namespace })
  if (terminal.metadata.annotations['gardener.cloud/created-by'] !== username) {
    throw new Forbidden(`You are not allowed to keep terminal session alive with name ${terminal.metadata.name}`)
  }

  await setKeepaliveAnnotation(client, terminal)
  return { ok: true }
}

function getTerminalResource (client, { name, namespace }) {
  if (!name || !namespace) {
    throw new UnprocessableEntity('name and namespace are required')
  }

  return client['dashboard.gardener.cloud'].terminals.get(namespace, name)
}

async function setKeepaliveAnnotation (client, terminal) {
  const annotations = {
    'dashboard.gardener.cloud/operation': 'keepalive'
  }
  try {
    const { name, namespace } = terminal.metadata
    const body = { metadata: { annotations } }
    await client['dashboard.gardener.cloud'].terminals.mergePatch(namespace, name, body)
  } catch (err) {
    logger.error('Could not keepalive terminal:', err)
    throw new Error('Could not keepalive terminal')
  }
}

async function getTerminalConfig ({ user, namespace, name, target }) {
  const client = user.client
  const isAdmin = user.isAdmin

  const config = {
    container: {
      image: getContainerImage({ isAdmin })
    }
  }

  if (target === TargetEnum.SHOOT) {
    const secretRef = {
      namespace,
      name: `${name}.kubeconfig`
    }
    const hostClient = await client.createKubeconfigClient(secretRef)

    const nodeList = await hostClient.core.nodes.list()
    config.nodes = _
      .chain(nodeList)
      .get('items')
      .map(fromNodeResource)
      .value()
  }
  return config
}

function pickShortcutValues (data) {
  const shortcut = _.pick(data, [
    'title',
    'description',
    'target',
    'container.image',
    'container.command',
    'container.args',
    'shootSelector.matchLabels'
  ])
  return shortcut
}

function fromShortcutSecretResource (secret) {
  const shortcutsBase64 = _.get(secret, 'data.shortcuts')
  const shortcuts = yaml.safeLoad(decodeBase64(shortcutsBase64))
  return _
    .chain(shortcuts)
    .map(pickShortcutValues)
    .filter(shortcut => !_.isEmpty(shortcut))
    .filter(shortcut => !_.isEmpty(_.trim(shortcut.title)))
    .filter(shortcut => _.includes([TargetEnum.GARDEN, TargetEnum.CONTROL_PLANE, TargetEnum.SHOOT], shortcut.target))
    .value()
}
exports.fromShortcutSecretResource = fromShortcutSecretResource // for unit tests

async function listShortcuts ({ user, namespace }) {
  const client = user.client

  try {
    const shortcuts = await client.core.secrets.get(namespace, 'terminal.shortcuts')

    return fromShortcutSecretResource(shortcuts)
  } catch (err) {
    if (isHttpError(err, 404)) {
      return []
    }
    throw err
  }
}

exports.bootstrapper = new Bootstrapper()
