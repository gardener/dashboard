//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import requestModule from '@gardener-dashboard/request'
import kubeConfigModule from '@gardener-dashboard/kube-config'
import kubeClientModule from '@gardener-dashboard/kube-client'
import createError from 'http-errors'
import * as utils from '../utils/index.js'
import cache from '../cache/index.js'
import * as authorization from './authorization.js'
import logger from '../logger/index.js'
import _ from 'lodash-es'
import semver from 'semver'
import config from '../config/index.js'
import { list as listProjects } from  './projects.js'

const { isHttpError } = requestModule
const { Config } = kubeConfigModule
const { Resources, dashboardClient } = kubeClientModule
const {
  decodeBase64,
  encodeBase64,
  getSeedNameFromShoot,
} = utils
export async function list ({ user, namespace, labelSelector }) {
  const query = {}
  if (labelSelector) {
    query.labelSelector = labelSelector
  }
  if (namespace === '_all') {
    if (await authorization.canListShoots(user)) {
      // user is permitted to list shoots in all namespaces
      return {
        apiVersion: 'v1',
        kind: 'List',
        items: cache.getShoots(namespace, query),
      }
    } else {
      // user is permitted to list shoots only in namespaces associated with their projects
      const projects = await listProjects({ user, canListProjects: false })
      const namespaces = _.map(projects, 'spec.namespace')

      const results = await Promise.allSettled(namespaces.map(async namespace => {
        const allowed = await authorization.canListShoots(user, namespace)
        return [namespace, allowed]
      }))

      const allowedNamespaceMap = _
        .chain(results)
        .filter(['status', 'fulfilled'])
        .map('value')
        .thru(value => new Map(value))
        .value()

      return {
        apiVersion: 'v1',
        kind: 'List',
        items: namespaces
          .filter(namespace => allowedNamespaceMap.get(namespace))
          .flatMap(namespace => cache.getShoots(namespace, query)),
      }
    }
  }
  const isAllowed = await authorization.canListShoots(user, namespace)
  if (!isAllowed) {
    throw createError(403, `No authorization to list shoots in namespace ${namespace}`)
  }
  return {
    apiVersion: 'v1',
    kind: 'List',
    items: cache.getShoots(namespace, query),
  }
}

export async function create ({ user, namespace, body, ...options }) {
  const client = user.client
  const username = user.id

  const annotations = {
    'gardener.cloud/created-by': username,
  }

  body = _.merge({}, body, { metadata: { namespace, annotations } })
  return client['core.gardener.cloud'].shoots.create(namespace, body, options)
}

export async function read ({ user, namespace, name }) {
  const client = user.client

  return client['core.gardener.cloud'].shoots.get(namespace, name)
}

export async function patch ({ user, namespace, name, body }) {
  const client = user.client
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}

export async function replace ({ user, namespace, name, body, ...options }) {
  const client = user.client

  const { metadata, kind, apiVersion, status } = await client['core.gardener.cloud'].shoots.get(namespace, name)
  const {
    metadata: { labels, annotations },
    spec,
  } = body
  // assign new labels and annotations to metadata
  Object.assign(metadata, { labels, annotations })
  // compose new body
  body = { kind, apiVersion, metadata, spec, status }
  // replace
  return client['core.gardener.cloud'].shoots.update(namespace, name, body, options)
}

export async function replaceVersion ({ user, namespace, name, body }) {
  const client = user.client
  const version = body.version
  const patchOperations = [{
    op: 'replace',
    path: '/spec/kubernetes/version',
    value: version,
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, name, patchOperations)
}

export async function replaceHibernationEnabled ({ user, namespace, name, body }) {
  const client = user.client
  const enabled = !!body.enabled
  const payload = {
    spec: {
      hibernation: {
        enabled,
      },
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function replaceHibernationSchedules ({ user, namespace, name, body }) {
  const client = user.client
  const schedules = body
  const payload = {
    spec: {
      hibernation: {
        schedules,
      },
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function replacePurpose ({ user, namespace, name, body }) {
  const client = user.client
  const purpose = body.purpose
  const payload = {
    spec: {
      purpose,
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function replaceSeedName ({ user, namespace, name, body }) {
  const client = user.client
  const seedName = body.seedName
  const patchOperations = [{
    op: 'replace',
    path: '/spec/seedName',
    value: seedName,
  }]
  return client['core.gardener.cloud'].shoots.jsonPatch(namespace, [name, 'binding'], patchOperations)
}

export async function createAdminKubeconfig ({ user, namespace, name, body }) {
  const client = user.client
  const { apiVersion, kind } = Resources.AdminKubeconfigRequest
  const payload = {
    kind,
    apiVersion,
    spec: {
      expirationSeconds: body.expirationSeconds,
    },
  }

  const { status } = await client['core.gardener.cloud'].shoots.createAdminKubeconfigRequest(namespace, name, payload)
  const kubeconfig = utils.decodeBase64(status.kubeconfig)

  return {
    kubeconfig,
  }
}

export async function replaceAddons ({ user, namespace, name, body }) {
  const client = user.client
  const addons = body
  const payload = {
    spec: {
      addons,
    },
  }

  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function replaceControlPlaneHighAvailability ({ user, namespace, name, body }) {
  const client = user.client
  const highAvailability = body
  const payload = {
    spec: {
      controlPlane: {
        highAvailability,
      },
    },
  }

  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function patchProvider ({ user, namespace, name, body }) {
  const client = user.client
  const payload = {
    spec: {
      provider: body,
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export async function replaceMaintenance ({ user, namespace, name, body }) {
  const client = user.client
  const { timeWindowBegin, timeWindowEnd, updateKubernetesVersion, updateOSVersion } = body
  const payload = {
    spec: {
      maintenance: {
        timeWindow: {
          begin: timeWindowBegin,
          end: timeWindowEnd,
        },
        autoUpdate: {
          kubernetesVersion: updateKubernetesVersion,
          machineImageVersion: updateOSVersion,
        },
      },
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, payload)
}

export const patchAnnotations = async function ({ user, namespace, name, annotations }) {
  const client = user.client
  const body = {
    metadata: {
      annotations,
    },
  }
  return client['core.gardener.cloud'].shoots.mergePatch(namespace, name, body)
}

export async function remove ({ user, namespace, name }) {
  const client = user.client
  const annotations = {
    'confirmation.gardener.cloud/deletion': 'true',
  }
  await patchAnnotations({ user, namespace, name, annotations })

  return client['core.gardener.cloud'].shoots.delete(namespace, name)
}

export function getDashboardUrlPath (kubernetesVersion) {
  if (!kubernetesVersion) {
    return undefined
  }
  if (semver.lt(kubernetesVersion, '1.16.0')) {
    return '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/'
  }
  return '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
}

export async function info ({ user, namespace, name }) {
  const client = user.client

  const shoot = await read({ user, namespace, name })

  const data = {
    canLinkToSeed: false,
  }

  try {
    data.kubeconfigGardenlogin = await getKubeconfigGardenlogin(client, shoot)
  } catch (err) {
    logger.info('failed to get gardenlogin kubeconfig', err.message)
  }

  if (shoot.spec.seedName) {
    const seed = cache.getSeed(getSeedNameFromShoot(shoot))
    if (seed) {
      try {
        data.canLinkToSeed = !!(await client['core.gardener.cloud'].shoots.get('garden', seed.metadata.name))
      } catch (err) {
        data.canLinkToSeed = false
      }
    }
  }

  data.dashboardUrlPath = getDashboardUrlPath(shoot.spec.kubernetes.version)

  const oidcObservabilityUrlsEnabled = _.get(config, ['frontend', 'features', 'oidcObservabilityUrlsEnabled'], false)
  if (!oidcObservabilityUrlsEnabled && await authorization.canGetSecret(user, namespace, `${name}.monitoring`)) {
    await assignMonitoringSecret(client, data, namespace, name)
  }

  return data
}

export async function getGardenClusterIdentity () {
  const configClusterIdentity = _.get(config, ['clusterIdentity'])

  if (configClusterIdentity) {
    return configClusterIdentity
  }

  const clusterIdentity = await dashboardClient.core.configmaps.get('kube-system', 'cluster-identity')

  return clusterIdentity.data['cluster-identity']
}

export async function getClusterCaData (client, { namespace, name }) {
  const configmap = await client.core.configmaps.get(namespace, `${name}.ca-cluster`)
  return encodeBase64(configmap.data?.['ca.crt'])
}

async function getKubeconfigGardenlogin (client, shoot) {
  if (!shoot.status?.advertisedAddresses?.length) {
    throw new Error('Shoot has no advertised addresses')
  }

  const { namespace, name } = shoot.metadata

  const [
    caData,
    gardenClusterIdentity,
  ] = await Promise.all([
    getClusterCaData(client, { namespace, name }),
    getGardenClusterIdentity(),
  ])

  const extensions = [{
    name: 'client.authentication.k8s.io/exec',
    extension: {
      shootRef: { namespace, name },
      gardenClusterIdentity,
    },
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
            'get-client-certificate',
          ],
          provideClusterInfo: true,
          interactiveMode: 'IfAvailable',
          installHint,
        },
      },
    }],
  }

  for (const [i, address] of shoot.status.advertisedAddresses.entries()) {
    const isKubeApiserverAddress = ['external', 'internal', 'unmanaged'].includes(address.name)
    if (!isKubeApiserverAddress) {
      continue
    }

    const name = `${userName}-${address.name}`
    if (i === 0) {
      cfg['current-context'] = name
    }

    cfg.clusters.push({
      name,
      cluster: {
        server: address.url,
        'certificate-authority-data': caData,
        extensions,
      },
    })

    cfg.contexts.push({
      name,
      context: {
        cluster: name,
        user: userName,
        namespace: 'default',
      },
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
      .get(['data'])
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
