//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isHttpError } = require('@gardener-dashboard/request')
const { cleanKubeconfig, Config } = require('@gardener-dashboard/kube-config')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const resources = require('@gardener-dashboard/kube-client/lib/resources')
const utils = require('../utils')
const cache = require('../cache')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')
const semver = require('semver')
const config = require('../config')

const { decodeBase64, getSeedNameFromShoot, getSeedIngressDomain, projectFilter } = utils
const { getSeed } = cache

exports.list = async function ({ user, namespace, labelSelector, shootsWithIssuesOnly = false }) {
  const client = user.client
  const query = {}
  if (labelSelector) {
    query.labelSelector = labelSelector
  } else if (shootsWithIssuesOnly) {
    query.labelSelector = 'shoot.gardener.cloud/status!=healthy'
  }
  if (namespace === '_all') {
    if (await authorization.isAdmin(user)) {
      return client['core.gardener.cloud'].shoots.listAllNamespaces(query)
    } else {
      const promises = _
        .chain(cache.getProjects())
        .filter(projectFilter(user, false))
        .map(project => client['core.gardener.cloud'].shoots.list(project.spec.namespace, query))
        .value()
      const shootLists = await Promise.all(promises)
      return {
        apiVersion: 'v1',
        kind: 'List',
        items: _.flatMap(shootLists, 'items')
      }
    }
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

exports.replaceEnableStaticTokenKubeconfig = async function ({ user, namespace, name, body }) {
  const client = user.client
  const enableStaticTokenKubeconfig = body.enableStaticTokenKubeconfig === true
  const patchOperations = [{
    op: 'replace',
    path: '/spec/kubernetes/enableStaticTokenKubeconfig',
    value: enableStaticTokenKubeconfig
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

exports.replaceSeedName = async function ({ user, namespace, name, body }) {
  const client = user.client
  const seedName = body.seedName
  const patchOperations = [{
    op: 'replace',
    path: '/spec/seedName',
    value: seedName
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, [name, 'binding'], patchOperations)
}

exports.getAdminKubeconfig = async function ({ user, namespace, name, expirationSeconds }) {
  const client = user.client
  const { apiVersion, kind } = resources.Resources.AdminKubeconfigRequest
    const body = {
      kind,
      apiVersion,
      spec: {
        expirationSeconds: expirationSeconds
      }
    }

  return client['core.gardener.cloud'].shoots.createAdminKubeconfigRequest(namespace, name, body)
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

exports.replaceControlPlaneHighAvailability = async function ({ user, namespace, name, body }) {
  const client = user.client
  const highAvailability = body
  const payload = {
    spec: {
      controlPlane: {
        highAvailability
      }
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

  try {
    data.kubeconfigGardenlogin = await getKubeconfigGardenlogin(client, shoot)
  } catch (err) {
    logger.info('failed to get gardenlogin kubeconfig', err.message)
  }

  if (shoot.spec.seedName) {
    const seed = getSeed(getSeedNameFromShoot(shoot))
    const prefix = _.replace(shoot.status.technicalID, /^shoot-{1,2}/, '')
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

  /*
    We explicitly use the (privileged) dashboardClient here for fetching the monitoring credentials instead of using the user's token
    as we agreed that also project viewers should be able to see the monitoring credentials.
    Usually project viewers do not have the permission to read the <shootName>.monitoring credential.
    Our assumption: if the user can read the shoot resource, the user can be considered as project viewer.
    This is only a temporary workaround until a Plutono SSO solution is implemented https://github.com/gardener/monitoring/issues/11.
  */
  await assignMonitoringSecret(dashboardClient, data, namespace, name)

  return data
}

async function getGardenClusterIdentity () {
  const configClusterIdentity = _.get(config, 'clusterIdentity')

  if (configClusterIdentity) {
    return configClusterIdentity
  }

  const clusterIdentity = await dashboardClient.core.configmaps.get('kube-system', 'cluster-identity')

  return clusterIdentity.data['cluster-identity']
}
exports.getGardenClusterIdentity = getGardenClusterIdentity

async function getKubeconfigGardenlogin (client, shoot) {
  if (!shoot.status?.advertisedAddresses?.length) {
    throw new Error('Shoot has no advertised addresses')
  }

  const { namespace, name } = shoot.metadata

  const [
    ca,
    gardenClusterIdentity
  ] = await Promise.all([
    client.core.secrets.get(namespace, `${name}.ca-cluster`),
    getGardenClusterIdentity()
  ])

  const caData = ca.data?.['ca.crt']

  const extensions = [{
    name: 'client.authentication.k8s.io/exec',
    extension: {
      shootRef: { namespace, name },
      gardenClusterIdentity
    }
  }]
  const userName = `${namespace}--${name}`

  const installHint = `Follow the instructions on
- https://github.com/gardener/gardenlogin#installation to install and
- https://github.com/gardener/gardenlogin#configure-gardenlogin to configure the gardenlogin credential plugin.

The following is a sample configuration for gardenlogin as well as gardenctl. Place the file under ~/.garden/gardenctl-v2.yaml.

---
gardens:
  - identity: ${gardenClusterIdentity}
    kubeconfig: "<path-to-garden-cluster-kubeconfig>"
...

Alternatively, you can run the following gardenctl command:

$ gardenctl config set-garden ${gardenClusterIdentity} --kubeconfig "<path-to-garden-cluster-kubeconfig>"

Note that the kubeconfig refers to the path of the garden cluster kubeconfig which you can download from the Account page.`

  const cfg = {
    clusters: [],
    contexts: [],
    users: [{
      name: userName,
      user: {
        exec: {
          apiVersion: 'client.authentication.k8s.io/v1beta1',
          command: 'kubectl-gardenlogin',
          args: [
            'get-client-certificate'
          ],
          provideClusterInfo: true,
          interactiveMode: 'IfAvailable',
          installHint
        }
      }
    }]
  }

  for (const [i, address] of shoot.status.advertisedAddresses.entries()) {
    const name = `${userName}-${address.name}`
    if (i === 0) {
      cfg['current-context'] = name
    }

    cfg.clusters.push({
      name,
      cluster: {
        server: address.url,
        'certificate-authority-data': caData,
        extensions
      }
    })

    cfg.contexts.push({
      name,
      context: {
        cluster: name,
        user: userName,
        namespace: 'default'
      }
    })
  }

  return new Config(cfg).toYAML()
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

async function assignMonitoringSecret (client, data, namespace, shootName) {
  const name = `${shootName}.monitoring`
  const secret = await getSecret(client, { namespace, name })
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
