//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isHttpError } = require('@gardener-dashboard/request')
const { cleanKubeconfig } = require('@gardener-dashboard/kube-config')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const utils = require('../utils')
const { getSeed } = require('../cache')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')
const semver = require('semver')

const { decodeBase64, getSeedNameFromShoot, getSeedIngressDomain } = utils

exports.list = async function ({ user, namespace, shootsWithIssuesOnly = false }) {
  const client = user.client
  const query = {}
  if (shootsWithIssuesOnly) {
    query.labelSelector = 'shoot.gardener.cloud/status!=healthy'
  }
  if (!namespace) {
    return client['core.gardener.cloud'].shoots.listAllNamespaces(query)
  }
  return client['core.gardener.cloud'].shoots.list(namespace, query)
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.client
  const username = user.id

  const annotations = {
    'gardener.cloud/created-by': username
  }

  body = _.merge({}, body, { metadata: { namespace, annotations } })
  return client['core.gardener.cloud'].shoots.create(namespace, body)
}

async function read ({ user, namespace, name }) {
  const client = user.client

  return client['core.gardener.cloud'].shoots.get(namespace, name)
}
exports.read = read

async function patch ({ user, namespace, name, body }) {
  const client = user.client
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}
exports.patch = patch

exports.replace = async function ({ user, namespace, name, body }) {
  const client = user.client

  const { metadata, kind, apiVersion, status } = await client['core.gardener.cloud'].shoots.get(namespace, name)
  const {
    metadata: { labels, annotations },
    spec
  } = body
  // assign new labels and annotations to metadata
  Object.assign(metadata, { labels, annotations })
  // compose new body
  body = { kind, apiVersion, metadata, spec, status }
  // replace
  return client['core.gardener.cloud'].shoots.update(namespace, name, body)
}

exports.replaceVersion = async function ({ user, namespace, name, body }) {
  const client = user.client
  const version = body.version
  const patchOperations = [{
    op: 'replace',
    path: '/spec/kubernetes/version',
    value: version
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, name, patchOperations)
}

exports.replaceHibernationEnabled = async function ({ user, namespace, name, body }) {
  const client = user.client
  const enabled = !!body.enabled
  const payload = {
    spec: {
      hibernation: {
        enabled
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceHibernationSchedules = async function ({ user, namespace, name, body }) {
  const client = user.client
  const schedules = body
  const payload = {
    spec: {
      hibernation: {
        schedules
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replacePurpose = async function ({ user, namespace, name, body }) {
  const client = user.client
  const purpose = body.purpose
  const payload = {
    spec: {
      purpose
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceAddons = async function ({ user, namespace, name, body }) {
  const client = user.client
  const addons = body
  const payload = {
    spec: {
      addons
    }
  }

  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceDns = async function ({ user, namespace, name, body }) {
  const client = user.client
  const dns = body
  const payload = {
    spec: {
      dns
    }
  }

  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.patchProvider = async function ({ user, namespace, name, body }) {
  const client = user.client
  const payload = {
    spec: {
      provider: body
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

exports.replaceMaintenance = async function ({ user, namespace, name, body }) {
  const client = user.client
  const { timeWindowBegin, timeWindowEnd, updateKubernetesVersion, updateOSVersion } = body
  const payload = {
    spec: {
      maintenance: {
        timeWindow: {
          begin: timeWindowBegin,
          end: timeWindowEnd
        },
        autoUpdate: {
          kubernetesVersion: updateKubernetesVersion,
          machineImageVersion: updateOSVersion
        }
      }
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

const patchAnnotations = async function ({ user, namespace, name, annotations }) {
  const client = user.client
  const body = {
    metadata: {
      annotations
    }
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}
exports.patchAnnotations = patchAnnotations

exports.remove = async function ({ user, namespace, name }) {
  const client = user.client
  const annotations = {
    'confirmation.gardener.cloud/deletion': 'true'
  }
  await patchAnnotations({ user, namespace, name, annotations })

  return client['core.gardener.cloud'].shoots.delete(namespace, name)
}

function getDashboardUrlPath (kubernetesVersion) {
  if (!kubernetesVersion) {
    return undefined
  }
  if (semver.lt(kubernetesVersion, '1.16.0')) {
    return '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/'
  }
  return '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
}
exports.getDashboardUrlPath = getDashboardUrlPath

exports.info = async function ({ user, namespace, name }) {
  const client = user.client

  const [
    { value: shoot, reason: shootError },
    { value: secret }
  ] = await Promise.allSettled([
    read({
      user,
      namespace,
      name
    }),
    client.getSecret({
      namespace,
      name: `${name}.kubeconfig`,
      throwNotFound: false
    })
  ])

  if (shootError) {
    throw shootError
  }

  const data = {
    canLinkToSeed: false
  }
  if (shoot.spec.seedName) {
    const seed = getSeed(getSeedNameFromShoot(shoot))
    const prefix = _.replace(shoot.status.technicalID, /^shoot--/, '')
    if (prefix) {
      const ingressDomain = getSeedIngressDomain(seed)
      if (ingressDomain) {
        data.seedShootIngressDomain = `${prefix}.${ingressDomain}`
      }
    }
    if (seed && namespace !== 'garden') {
      try {
        data.canLinkToSeed = !!(await client['core.gardener.cloud'].shoots.get('garden', seed.metadata.name))
      } catch (err) {
        data.canLinkToSeed = false
      }
    }
  }

  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('kubeconfig', 'username', 'password', 'token')
      .forEach((value, key) => {
        value = decodeBase64(value)
        if (key === 'kubeconfig') {
          try {
            const kubeconfigObject = cleanKubeconfig(value)
            data[key] = kubeconfigObject.toYAML()
            data.serverUrl = kubeconfigObject.currentCluster.server
          } catch (err) {
            logger.error('failed to clean kubeconfig', err)
          }
        } else {
          data[`cluster_${key}`] = value
        }
      })
      .commit()

    data.dashboardUrlPath = getDashboardUrlPath(shoot.spec.kubernetes.version)
  }

  const isAdmin = await authorization.isAdmin(user)
  if (!isAdmin) {
    /*
      We explicitly use the (privileged) dashboardClient here for fetching the monitoring credentials instead of using the user's token
      as we agreed that also project viewers should be able to see the monitoring credentials.
      Usually project viewers do not have the permission to read the <shootName>.monitoring credential.
      Our assumption: if the user can read the shoot resource, the user can be considered as project viewer.
      This is only a temporary workaround until a Grafana SSO solution is implemented https://github.com/gardener/monitoring/issues/11.
    */
    await assignMonitoringSecret(dashboardClient, data, namespace, name)
  }

  return data
}

exports.seedInfo = async function ({ user, namespace, name }) {
  const client = user.client

  const shoot = await read({ user, namespace, name })

  const data = {}
  let seed
  if (shoot.spec.seedName) {
    seed = getSeed(getSeedNameFromShoot(shoot))
  }
  const isAdmin = await authorization.isAdmin(user)
  if (!isAdmin || !seed) {
    return data
  }

  if (!seed.spec.secretRef) {
    logger.info(`Could not fetch info from seed. 'spec.secretRef' on the seed ${seed.metadata.name} is missing. In case a shoot is used as seed, add the flag \`with-secret-ref\` to the \`shoot.gardener.cloud/use-as-seed\` annotation`)
    return data
  }

  try {
    const seedClient = await client.createKubeconfigClient(seed.spec.secretRef)
    const seedShootNamespace = shoot.status.technicalID
    await assignMonitoringSecret(seedClient, data, seedShootNamespace)
  } catch (err) {
    logger.error('Failed to retrieve information using seed core client', err)
  }

  return data
}

async function getSecret (client, { namespace, name }) {
  try {
    return await client.core.secrets.get(namespace, name)
  } catch (err) {
    if (isHttpError(err, 404)) {
      return
    }
    logger.error('failed to fetch %s secret: %s', name, err)
    throw err
  }
}

async function getMonitoringSecret (client, namespace, shootName) {
  let name
  if (!shootName) {
    try {
      // read operator secret from seed
      const labelSelector = 'name=observability-ingress,managed-by=secrets-manager,manager-identity=gardenlet'
      const secretList = await client.core.secrets.list(namespace, { labelSelector })
      const secret = _
        .chain(secretList.items)
        .orderBy(['metadata.creationTimestamp'], ['desc'])
        .head()
        .value()
      if (secret) {
        return secret
      }
      // fallback to old secret name
      name = 'monitoring-ingress-credentials'
    } catch (err) {
      logger.error('failed to fetch %s secret: %s', name, err)
      throw err
    }
  } else {
    // read user secret from garden cluster
    name = `${shootName}.monitoring`
  }
  return getSecret(client, { namespace, name })
}

async function assignMonitoringSecret (client, data, namespace, shootName) {
  const secret = await getMonitoringSecret(client, namespace, shootName)

  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('username', 'password')
      .forEach((value, key) => {
        if (key === 'password') {
          data.monitoringPassword = decodeBase64(value)
        } else if (key === 'username') {
          data.monitoringUsername = decodeBase64(value)
        }
      })
      .commit()
  }
}
