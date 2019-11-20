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

const _ = require('lodash')
const logger = require('../logger')
const { Resources } = require('../kubernetes-client')
const { UnprocessableEntity, PreconditionFailed, MethodNotAllowed } = require('../errors')
const { format: fmt } = require('util')
const { decodeBase64, encodeBase64 } = require('../utils')
const whitelistedPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl']
const cloudprofiles = require('./cloudprofiles')
const shoots = require('./shoots')
const { getQuotas } = require('../cache')

function fromResource ({ secretBinding, cloudProviderKind, secret, quotas = [] }) {
  const cloudProfileName = secretBinding.metadata.labels['cloudprofile.garden.sapcloud.io/name']

  const infrastructureSecret = {}
  infrastructureSecret.metadata = _
    .chain(secretBinding.secretRef)
    .pick(['namespace', 'name'])
    .assign({
      cloudProviderKind,
      cloudProfileName,
      bindingNamespace: _.get(secretBinding, 'metadata.namespace'),
      bindingName: _.get(secretBinding, 'metadata.name')
    })
    .value()

  infrastructureSecret.quotas = quotas

  if (secret) {
    infrastructureSecret.metadata = _
      .chain(secret.metadata)
      .pick(['resourceVersion'])
      .assign(infrastructureSecret.metadata)
      .value()

    const iteratee = (value, key) => {
      value = decodeBase64(value)
      if (!_.includes(whitelistedPropertyKeys, key)) {
        value = '****************'
      }
      return value
    }
    infrastructureSecret.data = _.mapValues(secret.data, iteratee)

    const secretAccountKey = _.get(secret.data, 'serviceaccount.json')
    if (secretAccountKey) {
      infrastructureSecret.data.project = projectId(secretAccountKey)
    }
  }

  return infrastructureSecret
}

function projectId (serviceAccountKey) {
  try {
    const key = JSON.parse(decodeBase64(serviceAccountKey))
    const projectId = _.get(key, 'project_id', '')
    return projectId
  } catch (err) {
    return ''
  }
}

function toSecretResource ({ metadata, data }) {
  const resource = Resources.Secret
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const type = 'Opaque'
  metadata = _
    .chain(metadata)
    .pick(['namespace', 'name'])
    .value()
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw new UnprocessableEntity('Failed to encode "base64" secret data')
  }
  return { apiVersion, kind, metadata, type, data }
}

function toSecretBindingResource ({ metadata }) {
  const resource = Resources.SecretBinding
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const name = metadata.bindingName
  const secretRef = {
    name: metadata.name,
    namespace: metadata.namespace
  }
  const labels = {
    'cloudprofile.garden.sapcloud.io/name': metadata.cloudProfileName
  }

  metadata = _
    .chain(metadata)
    .pick(['namespace'])
    .assign({ name, labels })
    .value()
  return { apiVersion, kind, metadata, secretRef }
}

function resolveQuotas (secretBinding) {
  const quotas = getQuotas()
  const findQuota = ({ namespace, name } = {}) => _.find(quotas, ({ metadata }) => metadata.namespace === namespace && metadata.name === name)
  try {
    return _
      .chain(secretBinding.quotas)
      .map(findQuota)
      .compact()
      .value()
  } catch (err) {
    return []
  }
}

async function getInfrastructureSecrets ({ secretBindings, cloudProfileList, secretList }) {
  return _
    .chain(secretBindings)
    .map(secretBinding => {
      try {
        const cloudProfileName = _.get(secretBinding, ['metadata', 'labels', 'cloudprofile.garden.sapcloud.io/name'])
        const cloudProfile = _.find(cloudProfileList, ['metadata.name', cloudProfileName])
        const cloudProviderKind = _.get(cloudProfile, 'metadata.cloudProviderKind')
        const secretName = _.get(secretBinding, 'secretRef.name')
        if (!cloudProviderKind) {
          throw new Error(fmt('Could not determine cloud provider kind for cloud profile name %s. Skipping infrastructure secret with name %s', cloudProfileName, secretName))
        }
        const secret = _.find(secretList, ['metadata.name', secretName]) // pragma: whitelist secret
        if (secretBinding.metadata.namespace === secretBinding.secretRef.namespace && !secret) {
          throw new Error(fmt('Secret missing for secretbinding in own namespace. Skipping infrastructure secret with name %s', secretName))
        }
        return fromResource({
          secretBinding,
          cloudProviderKind,
          secret,
          quotas: resolveQuotas(secretBinding)
        })
      } catch (err) {
        logger.error(err.message)
      }
    })
    .compact()
    .value()
}

async function getCloudProviderKind (cloudProfileName) {
  const cloudProfile = await cloudprofiles.read({ name: cloudProfileName })
  const cloudProviderKind = _.get(cloudProfile, 'metadata.cloudProviderKind')
  return cloudProviderKind
}

exports.list = async function ({ user, namespace }) {
  const client = user.api

  try {
    const cloudProfileList = cloudprofiles.list()
    const [
      { items: secretList },
      { items: secretBindings }
    ] = await Promise.all([
      client.core.secrets.get({ namespace }),
      client['core.gardener.cloud'].secretbindings.get({ namespace })
    ])
    return getInfrastructureSecrets({
      secretBindings,
      cloudProfileList,
      secretList
    })
  } catch (err) {
    logger.error(err)
    throw err
  }
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.api

  const secret = await client.core.secrets.create({
    namespace,
    json: toSecretResource(body)
  })

  const secretBinding = await client['core.gardener.cloud'].secretbindings.create({
    namespace,
    json: toSecretBindingResource(body)
  })

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(cloudProfileName)
  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding)
  })
}

function checkIfOwnSecret (bodySecretBinding) {
  const secretNamespace = _.get(bodySecretBinding, 'secretRef.namespace')
  const secretBindingNamespace = _.get(bodySecretBinding, 'metadata.namespace')

  if (secretNamespace !== secretBindingNamespace) {
    throw new MethodNotAllowed('Patch allowed only for secrets in own namespace')
  }
}

exports.patch = async function ({ user, namespace, bindingName, body }) {
  const client = user.api

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get({
    namespace,
    name: bindingName
  })
  const secretName = _.get(secretBinding, 'secretRef.name')

  checkIfOwnSecret(secretBinding)

  const secret = await client.core.secrets.patch({
    type: 'merge',
    namespace,
    name: secretName,
    json: toSecretResource(body)
  })

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(cloudProfileName)

  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding)
  })
}

exports.remove = async function ({ user, namespace, bindingName }) {
  const client = user.api

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get({
    namespace,
    name: bindingName
  })
  const secretName = _.get(secretBinding, 'secretRef.name')

  checkIfOwnSecret(secretBinding)

  const { items: shootList } = await shoots.list({ user, namespace })
  const predicate = (item) => {
    const itemSecretBindingName = _.get(item, 'spec.secretBindingName')
    return itemSecretBindingName === bindingName
  }
  const secretReferencedByShoot = _.find(shootList, predicate)
  if (secretReferencedByShoot) {
    throw new PreconditionFailed(`Only secrets not referened by any shoot can be deleted`)
  }

  await Promise.all([
    await client['core.gardener.cloud'].secretbindings.delete({ namespace, name: bindingName }),
    await client.core.secrets.delete({ namespace, name: secretName })
  ])
  return { metadata: { name: secretName, bindingName, namespace } }
}
