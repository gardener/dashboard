//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import _ from 'lodash-es'
import hash from 'object-hash'
import { load as yamlLoad } from 'js-yaml'
import gardenerConfig from '../../config/index.js'
import { getClusterCaData } from '../shoots.js'
import kubeClientModule from '@gardener-dashboard/kube-client'
import {
  decodeBase64,
  getConfigValue,
  getSeedNameFromShoot,
} from '../../utils/index.js'
import {
  toTerminalResource,
  fromNodeResource,
} from './resources.js'
import {
  getKubeApiServerHostForSeedOrManagedSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterCredentials,
  getGardenHostClusterKubeApiServer,
  getShootRef,
} from './utils.js'
import cache from '../../cache/index.js'
import logger from '../../logger/index.js'
import { createConverter } from '../../markdown.js'
const { Resources } = kubeClientModule
const { Forbidden, UnprocessableEntity, InternalServerError, isHttpError } = httpErrors
const { getSeed, findProjectByNamespace } = cache

const TERMINAL_CONTAINER_NAME = 'terminal'

// name of the dashboard webterminal serviceaccount used by non-admins
const DASHBOARD_WEBTERMINAL_NAME = 'dashboard-webterminal'

const TargetEnum = {
  GARDEN: 'garden',
  CONTROL_PLANE: 'cp',
  SHOOT: 'shoot',
}

export const converter = createConverter()

export function create ({ user, body }) {
  const { coordinate: { namespace, name, target } } = body
  return getOrCreateTerminalSession({ user, namespace, name, target, body })
}

export async function config ({ user, body: { coordinate: { namespace, name, target } } }) {
  return getTerminalConfig({ user, namespace, name, target })
}

export function list ({ user, body: { coordinate: { namespace } } }) {
  return listTerminalSessions({ user, namespace })
}

export function remove ({ user, body = {} }) {
  return deleteTerminalSession({ user, body })
}

export function fetch ({ user, body = {} }) {
  return fetchTerminalSession({ user, body })
}

export async function heartbeat ({ user, body = {} }) {
  return heartbeatTerminalSession({ user, body })
}

// exported for unit test
export async function listProjectTerminalShortcuts ({ user, body = {} }) {
  const { coordinate: { namespace } } = body
  return listShortcuts({ user, namespace })
}

function toTerminalMetadata (terminal) {
  const metadata = _.pick(terminal.metadata, ['name', 'namespace'])
  metadata.identifier = _.get(terminal, ['metadata', 'annotations', 'dashboard.gardener.cloud/identifier'])
  return metadata
}

async function getImageHelpText (terminal) {
  const containerImage = _.get(terminal, ['spec', 'host', 'pod', 'container', 'image'])
  const containerImageDescriptions = getConfigValue('terminal.containerImageDescriptions', [])
  const containerImageDescription = findImageDescription(containerImage, containerImageDescriptions)
  return converter.makeSanitizedHtml(containerImageDescription)
}

export function findImageDescription (containerImage, containerImageDescriptions) {
  return _
    .chain(containerImageDescriptions)
    .find(({ image }) => {
      if (_.startsWith(image, '/') && _.endsWith(image, '/')) {
        image = image.substring(1, image.length - 1)
        return new RegExp(image).test(containerImage) // eslint-disable-line security/detect-non-literal-regexp
      }
      return image === containerImage
    })
    .get(['description'])
    .value()
}

async function readServiceAccountToken (client, { namespace, serviceAccountName }) {
  const { apiVersion, kind } = Resources.TokenRequest
  const body = {
    kind,
    apiVersion,
    spec: {
      expirationSeconds: _.get(gardenerConfig, ['terminal', 'serviceAccountTokenExpiration'], 43200), // default is 12h
    },
  }

  const tokenRequest = await client.core.serviceaccounts.createTokenRequest(namespace, serviceAccountName, body)

  return tokenRequest.status.token
}

async function listTerminals ({ user, namespace, identifier }) {
  const username = user.id
  const client = user.client

  const selectors = [
    `dashboard.gardener.cloud/created-by-hash=${hash(username)}`,
  ]
  if (identifier) {
    selectors.push(`dashboard.gardener.cloud/identifier-hash=${hash(identifier)}`)
  }
  const query = {
    labelSelector: selectors.join(','),
  }
  const terminals = await client['dashboard.gardener.cloud'].terminals.list(namespace, query)
  return _
    .chain(terminals)
    .get(['items'])
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
    cleanupProjectMembership: false,
    authorization: {
      roleBindings: undefined,
      projectMemberships: undefined,
    },
    apiServer: {
      caData: undefined,
    },
  }

  switch (target) {
    case TargetEnum.GARDEN: {
      targetCluster.kubeconfigContextNamespace = namespace
      targetCluster.apiServer.server = gardenerConfig.apiServerUrl
      targetCluster.apiServer.caData = gardenerConfig.apiServerCaData

      if (isAdmin) {
        targetCluster.namespace = 'garden'
        targetCluster.credentials = getConfigValue('terminal.garden.operatorCredentials')
        targetCluster.authorization.roleBindings = getConfigValue('terminal.garden.roleBindings', [
          {
            roleRef: {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'ClusterRole',
              name: 'gardener.cloud:system:administrators',
            },
            bindingKind: 'ClusterRoleBinding',
          },
        ])
      } else {
        const projectName = findProjectByNamespace(namespace).metadata.name
        targetCluster.namespace = namespace
        const serviceAccountName = DASHBOARD_WEBTERMINAL_NAME

        // test if service account exists and is not in deletion
        const serviceAccount = await client.core.serviceaccounts.get(namespace, serviceAccountName)
        if (serviceAccount.metadata.deletionTimestamp) {
          throw new Error('Can\'t create terminal for ServiceAccount that is marked for deletion')
        }

        targetCluster.credentials = {
          serviceAccountRef: {
            name: serviceAccountName,
            namespace,
          },
        }
        targetCluster.cleanupProjectMembership = true
        targetCluster.authorization.projectMemberships = [
          {
            projectName,
            roles: [
              'admin',
            ],
          },
        ]
      }

      break
    }
    case TargetEnum.SHOOT: {
      const caData = await getClusterCaData(client, { namespace, name })

      targetCluster.apiServer.serviceRef = {}
      targetCluster.apiServer.caData = caData

      if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluster is the seed
        targetCluster.apiServer.serviceRef.name = 'kube-apiserver'
      } else {
        targetCluster.apiServer.serviceRef.name = 'kubernetes'
        targetCluster.apiServer.serviceRef.namespace = 'default'
      }

      targetCluster.kubeconfigContextNamespace = 'default'
      targetCluster.namespace = undefined // this will create a temporary namespace
      targetCluster.credentials = {
        shootRef: {
          name,
          namespace,
        },
      }
      targetCluster.authorization.roleBindings = [
        {
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'cluster-admin',
          },
          bindingKind: 'ClusterRoleBinding',
        },
      ]
      break
    }
    case TargetEnum.CONTROL_PLANE: {
      if (!shootResource) {
        shootResource = await client.getShoot({ namespace, name })
      }
      const seedName = getSeedNameFromShoot(shootResource)
      const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seedName, throwNotFound: false })

      if (!managedSeed) {
        throw new Error('terminal cannot be hosted on non-managed seed')
      }
      const shootRef = getShootRef(managedSeed)
      const credentials = { shootRef }

      const caData = await getClusterCaData(client, { namespace: shootRef.namespace, name: shootRef.name })

      const seedShootNamespace = getSeedShootNamespace(shootResource)

      targetCluster.apiServer.caData = caData
      targetCluster.credentials = credentials
      targetCluster.kubeconfigContextNamespace = seedShootNamespace
      targetCluster.namespace = seedShootNamespace
      targetCluster.authorization.roleBindings = [
        {
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'cluster-admin',
          },
          bindingKind: 'RoleBinding',
        },
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
    credentials,
    kubeApiServer,
  ] = await Promise.all([
    await getGardenTerminalHostClusterCredentials(client),
    await getGardenHostClusterKubeApiServer(client),
  ])
  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.credentials = credentials
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
    hostCluster.isHostOrTargetHibernated = _.get(shootResource, ['spec', 'hibernation', 'enabled'], false)
  }

  const seedShootNamespace = getSeedShootNamespace(shootResource)
  const seedName = getSeedNameFromShoot(shootResource)
  const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seedName, throwNotFound: false })

  const seed = getSeed(seedName)

  if (!managedSeed) {
    throw new Error('terminal cannot be hosted on non-managed seed')
  }
  const shootRef = getShootRef(managedSeed)
  const credentials = { shootRef }

  hostCluster.namespace = seedShootNamespace
  hostCluster.credentials = credentials
  hostCluster.kubeApiServer = await getKubeApiServerHostForSeedOrManagedSeed(client, seed, managedSeed)
  return hostCluster
}

async function getShootHostCluster (client, { namespace, name, body, shootResource }) {
  const hostCluster = {}
  hostCluster.config = getConfigFromBody(body)

  if (!shootResource) {
    shootResource = await client.getShoot({ namespace, name })
  }
  hostCluster.isHostOrTargetHibernated = _.get(shootResource, ['spec', 'hibernation', 'enabled'], false)

  hostCluster.namespace = undefined // this will create a temporary namespace
  hostCluster.credentials = {
    shootRef: {
      namespace,
      name,
    },
  }
  hostCluster.kubeApiServer = await getKubeApiServerHostForShoot(shootResource)
  return hostCluster
}

function getContainerConfigFromBody ({ container }) {
  return {
    container: _.pick(container, ['image', 'command', 'args']),
  }
}

function getConfigFromBody (body) {
  const config = _.pick(body, ['node', 'hostPID', 'hostNetwork', 'container'])
  config.container = _.pick(config.container, ['image', 'command', 'args', 'privileged'])
  return config
}

function getPreferredHost ({ user, body }) {
  const defaultHost = user.isAdmin ? 'seed' : 'shoot'
  return _.get(body, ['preferredHost'], defaultHost)
}

function getHostCluster ({ user, namespace, name, target, preferredHost, body, shootResource }) {
  const client = user.client

  if (target === TargetEnum.GARDEN && user.isAdmin) {
    return getGardenTerminalHostCluster(client, { body })
  }

  if (user.isAdmin && preferredHost === 'seed') { // admin only - host cluster is the seed
    return getSeedHostCluster(client, { namespace, name, target, body, shootResource })
  }

  // host cluster is the shoot
  return getShootHostCluster(client, { namespace, name, body, shootResource })
}

async function createTerminal ({ user, namespace, target, hostCluster, targetCluster, identifier, preferredHost }) {
  const client = user.client
  const isAdmin = user.isAdmin
  const image = getContainerImage({ isAdmin, preferredImage: hostCluster.config.container.image })
  _.set(hostCluster, ['config', 'container', 'image'], image)

  const podLabels = getPodLabels(target)

  const terminalHost = createHost({
    ...hostCluster.config,
    namespace: hostCluster.namespace,
    credentials: hostCluster.credentials,
    podLabels,
  })
  const terminalTarget = createTarget({ ...targetCluster })

  const labels = {
    'dashboard.gardener.cloud/created-by-hash': hash(user.id),
  }
  if (identifier) {
    labels['dashboard.gardener.cloud/identifier-hash'] = hash(identifier)
  }

  const annotations = {
    'dashboard.gardener.cloud/identifier': identifier,
    'dashboard.gardener.cloud/preferredHost': preferredHost,
  }
  const prefix = `term-${target}-`
  const terminalResource = toTerminalResource({ prefix, namespace, annotations, labels, host: terminalHost, target: terminalTarget })

  return client['dashboard.gardener.cloud'].terminals.create(namespace, terminalResource)
}

function getPodLabels (target) {
  let labels = {
    'networking.gardener.cloud/to-dns': 'allowed',
    'networking.gardener.cloud/to-public-networks': 'allowed',
    'networking.gardener.cloud/to-private-networks': 'allowed',
  }
  switch (target) {
    case TargetEnum.GARDEN:
      labels = {} // no network restrictions for now
      break
    case TargetEnum.CONTROL_PLANE:
      labels['networking.gardener.cloud/to-runtime-apiserver'] = 'allowed'
      break
    case TargetEnum.SHOOT:
      labels['networking.gardener.cloud/to-shoot-networks'] = 'allowed'
      labels['networking.resources.gardener.cloud/to-kube-apiserver-tcp-443'] = 'allowed'
      break
  }
  return labels
}

function createHost ({ credentials, namespace, container, podLabels, node, hostPID = false, hostNetwork = false }) {
  const temporaryNamespace = _.isEmpty(namespace)
  const {
    image,
    command,
    args,
    privileged = false,
  } = container
  const host = {
    credentials,
    namespace,
    temporaryNamespace,
    pod: {
      labels: podLabels,
      container: {
        image,
        command,
        args,
        privileged,
      },
      hostPID,
      hostNetwork,
    },
  }
  if (node) {
    host.pod.nodeSelector = {
      'kubernetes.io/hostname': node,
    }
  }
  return host
}

function createTarget ({ kubeconfigContextNamespace, apiServer, credentials, authorization, namespace, cleanupProjectMembership }) {
  const temporaryNamespace = _.isEmpty(namespace)
  return {
    credentials,
    kubeconfigContextNamespace,
    apiServer,
    authorization,
    namespace,
    temporaryNamespace,
    cleanupProjectMembership,
  }
}

async function readTerminalUntilReady ({ user, namespace, name }) {
  const username = user.id
  const client = user.client

  const isTerminalReady = ({ type, object: terminal }) => {
    if (type === 'DELETE') {
      throw new InternalServerError('Terminal resource has been deleted')
    }
    if (terminal.metadata.annotations['gardener.cloud/created-by'] !== username) {
      throw new Forbidden('You are not the user who created the terminal resource')
    }
    const podName = _.get(terminal, ['status', 'podName'])
    const attachServiceAccountName = _.get(terminal, ['status', 'attachServiceAccountName'])

    const isReady = podName && attachServiceAccountName
    if (!isReady) {
      const lastErrorDescription = _.get(terminal, ['status', 'lastError', 'description'])
      return {
        ok: false,
        reason: lastErrorDescription,
      }
    }

    return { ok: true }
  }
  const asyncIterable = await client['dashboard.gardener.cloud'].terminals.watch(namespace, name)
  return asyncIterable.until(isTerminalReady, { timeout: 60 * 1000 })
}

async function getOrCreateTerminalSession ({ user, namespace, name, target, body = {} }) {
  const username = user.id
  const client = user.client
  const isAdmin = user.isAdmin

  let [
    terminal,
    shootResource,
  ] = await Promise.all([
    findExistingTerminalResource({ user, namespace, body }),
    getShootResource({ user, namespace, name, target }),
  ])

  const preferredHost = _.get(terminal, ['metadata', 'annotations', 'dashboard.gardener.cloud/preferredHost'], getPreferredHost({ user, body }))

  const [
    hostCluster,
    targetCluster,
  ] = await Promise.all([
    getHostCluster({ user, namespace, name, target, preferredHost, body, shootResource }),
    getTargetCluster({ user, namespace, name, target, preferredHost, shootResource }),
  ])

  if (hostCluster.isHostOrTargetHibernated) {
    throw new Error('Hosting cluster or target cluster is hibernated')
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

  if (target === TargetEnum.GARDEN && !isAdmin) {
    await ensureServiceAccountCleanup(client, { terminal, namespace, name: DASHBOARD_WEBTERMINAL_NAME })
  }

  const imageHelpText = await getImageHelpText(terminal)

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      kubeApiServer: hostCluster.kubeApiServer,
      namespace: terminal.spec.host.namespace,
    },
    imageHelpText,
  }
}

async function ensureServiceAccountCleanup (client, { terminal, namespace, name }) {
  const ownerRef = {
    apiVersion: terminal.apiVersion,
    kind: terminal.kind,
    blockOwnerDeletion: false,
    name: terminal.metadata.name,
    uid: terminal.metadata.uid,
  }

  const {
    metadata: {
      ownerReferences = [],
      labels = {},
      finalizers = [],
    },
  } = await client.core.serviceaccounts.get(namespace, name)

  let dirty = false

  if (!finalizers.includes('gardener.cloud/terminal')) {
    finalizers.push('gardener.cloud/terminal')
    dirty = true
  }

  if (!_.some(ownerReferences, ['uid', ownerRef.uid])) {
    ownerReferences.push(ownerRef)
    dirty = true
  }

  if (labels['reference.dashboard.gardener.cloud/terminal'] !== 'true') {
    labels['reference.dashboard.gardener.cloud/terminal'] = 'true'
    dirty = true
  }

  if (!dirty) {
    return
  }

  const payload = {
    metadata: {
      finalizers,
      ownerReferences,
      labels,
    },
  }

  await client.core.serviceaccounts.mergePatch(namespace, name, payload)
}

async function createHostClient (client, { shootRef }) {
  if (!shootRef) {
    throw new Error('shootRef is required')
  }
  return client.createShootAdminKubeconfigClient(shootRef)
}

async function fetchTerminalSession ({ user, body: { name, namespace } }) {
  const client = user.client

  const terminal = await readTerminalUntilReady({ user, name, namespace })
  const host = terminal.spec.host
  const hostClient = await createHostClient(client, host.credentials)
  const token = await readServiceAccountToken(hostClient, {
    namespace: host.namespace,
    serviceAccountName: terminal.status.attachServiceAccountName,
  })

  return {
    metadata: toTerminalMetadata(terminal),
    hostCluster: {
      token,
      pod: {
        name: terminal.status.podName,
        container: TERMINAL_CONTAINER_NAME,
      },
    },
  }
}

async function listTerminalSessions ({ user, namespace }) {
  const terminals = await listTerminals({ user, namespace })

  return _.map(terminals, terminal => {
    return {
      metadata: toTerminalMetadata(terminal),
    }
  })
}

function getSeedShootNamespace (shoot) {
  const seedShootNamespace = _.get(shoot, ['status', 'technicalID'])
  if (_.isEmpty(seedShootNamespace)) {
    throw new Error(`could not determine namespace in seed for shoot ${shoot.metadata.name}`)
  }
  return seedShootNamespace
}

export function ensureTerminalAllowed ({ method, isAdmin, body }) {
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
    'dashboard.gardener.cloud/operation': 'keepalive',
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
      image: getContainerImage({ isAdmin }),
    },
  }

  if (target === TargetEnum.SHOOT ||
     (target === TargetEnum.GARDEN && !isAdmin)) {
    const shootRef = {
      namespace,
      name,
    }
    try {
      const hostClient = await client.createShootAdminKubeconfigClient(shootRef)
      const nodeList = await hostClient.core.nodes.list()
      config.nodes = _
        .chain(nodeList)
        .get(['items'])
        .map(fromNodeResource)
        .value()
    } catch (err) {
      logger.error('Could not list terminal host nodes', err)
      config.nodes = []
    }
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
    'shootSelector.matchLabels',
  ])
  return shortcut
}

export function fromShortcutSecretResource (secret) {
  const shortcutsBase64 = _.get(secret, ['data', 'shortcuts'])
  const shortcuts = yamlLoad(decodeBase64(shortcutsBase64))
  return _
    .chain(shortcuts)
    .map(pickShortcutValues)
    .filter(shortcut => !_.isEmpty(shortcut))
    .filter(shortcut => !_.isEmpty(_.trim(shortcut.title)))
    .filter(shortcut => _.includes([TargetEnum.GARDEN, TargetEnum.CONTROL_PLANE, TargetEnum.SHOOT], shortcut.target))
    .value()
}

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
