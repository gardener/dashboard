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

const kubernetes = require('../kubernetes')
const { decodeBase64, getProjectByNamespace } = require('../utils')
const { getSeeds } = require('../cache')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')

function Garden ({ auth }) {
  return kubernetes.garden({ auth })
}

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function getSecret (core, namespace, name) {
  return core.ns(namespace).secrets.get({ name: name })
    .catch(err => {
      if (err.code === 404) {
        return
      }
      logger.error('failed to fetch %s secret: %s', name, err) // pragma: whitelist secret
      throw err
    })
}

async function assignComponentSecret (core, namespace, component, secretName, data) {
  const secret = await getSecret(core, namespace, secretName)
  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('username', 'password')
      .forEach((value, key) => {
        if (key === 'password') {
          data[`${component}_password`] = decodeBase64(value)
        } else if (key === 'username') {
          data[`${component}_username`] = decodeBase64(value)
        }
      })
      .commit()
  }
}

exports.list = async function ({ user, namespace, shootsWithIssuesOnly = false }) {
  let qs
  if (shootsWithIssuesOnly) {
    qs = { labelSelector: 'shoot.garden.sapcloud.io/status!=healthy' }
  }
  if (namespace) {
    return Garden(user).namespaces(namespace).shoots.get({ qs })
  } else {
    // only works if user is member of garden-administrators (admin)
    return Garden(user).shoots.get({ qs })
  }
}

exports.create = async function ({ user, namespace, body }) {
  const username = user.id
  const finalizers = ['gardener']
  const annotations = {
    'garden.sapcloud.io/createdBy': username
  }
  body = _.merge({}, body, { metadata: { namespace, finalizers, annotations } })
  return Garden(user).namespaces(namespace).shoots.post({ body })
}

exports.read = async function ({ user, namespace, name }) {
  return Garden(user).namespaces(namespace).shoots.get({ name })
}

const patch = exports.patch = async function ({ user, namespace, name, body }) {
  return Garden(user).namespaces(namespace).shoots.mergePatch({ name, body })
}

exports.replace = async function ({ user, namespace, name, body }) {
  const shoots = Garden(user).namespaces(namespace).shoots
  const { metadata, kind, apiVersion, status } = await shoots.get({ name })
  const {
    metadata: { labels, annotations },
    spec
  } = body
  // assign new labels and annotations to metadata
  Object.assign(metadata, { labels, annotations })
  // compose new body
  body = { kind, apiVersion, metadata, spec, status }
  // replace
  return shoots.put({ name, body })
}

exports.replaceVersion = async function ({ user, namespace, name, body }) {
  const version = body.version
  const patchOperations = [
    {
      op: 'replace',
      path: '/spec/kubernetes/version',
      value: version
    }
  ]
  return Garden(user).namespaces(namespace).shoots.jsonPatch({ name, body: patchOperations })
}

exports.replaceHibernationEnabled = async function ({ user, namespace, name, body }) {
  const enabled = !!body.enabled
  const payload = {
    spec: {
      hibernation: {
        enabled
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

exports.replaceHibernationSchedules = async function ({ user, namespace, name, body }) {
  const schedules = body
  const payload = {
    spec: {
      hibernation: {
        schedules
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

exports.replaceWorkers = async function ({ user, namespace, infrastructureKind, name, body }) {
  const workers = body
  const patchOperations = [
    {
      op: 'replace',
      path: `/spec/cloud/${infrastructureKind}/workers`,
      value: workers
    }
  ]
  return Garden(user).namespaces(namespace).shoots.jsonPatch({ name, body: patchOperations })
}

exports.replaceMaintenance = async function ({ user, namespace, name, body }) {
  const { timeWindowBegin, timeWindowEnd, updateKubernetesVersion } = body
  const payload = {
    spec: {
      maintenance: {
        timeWindow: {
          begin: timeWindowBegin,
          end: timeWindowEnd
        },
        autoUpdate: {
          kubernetesVersion: updateKubernetesVersion
        }
      }
    }
  }
  return patch({ user, namespace, name, body: payload })
}

const patchAnnotations = async function ({ user, namespace, name, annotations }) {
  const body = {
    metadata: {
      annotations: annotations
    }
  }
  return patch({ user, namespace, name, body })
}
exports.patchAnnotations = patchAnnotations

exports.remove = async function ({ user, namespace, name }) {
  const annotations = {
    'confirmation.garden.sapcloud.io/deletion': 'true'
  }
  await patchAnnotations({ user, namespace, name, annotations })

  return Garden(user).namespaces(namespace).shoots.delete({ name })
}

exports.info = async function ({ user, namespace, name }) {
  const core = Core(user)
  const readKubeconfigPromise = core.ns(namespace).secrets.get({ name: `${name}.kubeconfig` })
    .catch(err => {
      if (err.code === 404) {
        return
      }
      throw err
    })

  const [
    shoot,
    secret
  ] = await Promise.all([
    this.read({ user, namespace, name }),
    readKubeconfigPromise
  ])

  const seed = _.find(getSeeds(), ['metadata.name', shoot.spec.cloud.seed])

  const ingressDomain = _.get(seed, 'spec.ingressDomain')
  const projects = Garden(user).projects
  const namespaces = core.namespaces
  const project = await getProjectByNamespace(projects, namespaces, namespace)
  const projectName = project.metadata.name

  const monitoringComponent = 'monitoring'
  const loggingComponent = 'logging'
  const monitoringIngressSecretName = 'monitoring-ingress-credentials'
  const loggingIngressUserSecretName = name + '.logging'
  const loggingIngressAdminSecretName = 'logging-ingress-credentials'

  const data = {
    seedShootIngressDomain: `${name}.${projectName}.${ingressDomain}`
  }
  if (secret) {
    _
      .chain(secret)
      .get('data')
      .pick('kubeconfig', 'username', 'password')
      .forEach((value, key) => {
        if (key === 'password') {
          data['cluster_password'] = decodeBase64(value)
        } else if (key === 'username') {
          data['cluster_username'] = decodeBase64(value)
        } else {
          data[key] = decodeBase64(value)
        }
      })
      .commit()
    data.serverUrl = kubernetes.fromKubeconfig(data.kubeconfig).url
  }

  const isAdmin = await authorization.isAdmin(user)
  if (isAdmin) {
    const seedSecretName = _.get(seed, 'spec.secretRef.name')
    const seedSecretNamespace = _.get(seed, 'spec.secretRef.namespace')
    const seedSecret = await getSecret(core, seedSecretNamespace, seedSecretName)

    if (seedSecret) {
      const seedKubeconfig = decodeBase64(seedSecret.data.kubeconfig)

      const seedShootNS = _.get(shoot, 'status.technicalID')
      if (!_.isEmpty(seedShootNS)) {
        const core = kubernetes.core(kubernetes.fromKubeconfig(seedKubeconfig))

        await Promise.all([
          assignComponentSecret(core, seedShootNS, monitoringComponent, monitoringIngressSecretName, data),
          assignComponentSecret(core, seedShootNS, loggingComponent, loggingIngressAdminSecretName, data),
        ])
      }
    }
  } else {
    await assignComponentSecret(core, namespace, loggingComponent, loggingIngressUserSecretName, data)
  }

  return data
}
