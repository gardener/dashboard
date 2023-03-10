//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')
const logger = require('../logger')
const { Resources } = require('@gardener-dashboard/kube-client')
const createError = require('http-errors')
const { format: fmt } = require('util')
const { decodeBase64, encodeBase64 } = require('../utils')
const cleartextPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl', 'vsphereUsername', 'nsxtUsername', 'username', 'metalAPIURL', 'AWS_REGION']
const cloudprofiles = require('./cloudprofiles')
const shoots = require('./shoots')
const { getQuotas, findProjectByNamespace } = require('../cache')

function fromResource ({ secretBinding, cloudProviderKind, secret, quotas = [], projectName, hasCostObject }) {
  const labels = _.get(secretBinding, 'metadata.labels', {})
  const cloudProfileName = labels['cloudprofile.garden.sapcloud.io/name']
  const dnsProviderName = labels['gardener.cloud/dnsProviderName']

  const { metadata: { namespace, name }, secretRef } = secretBinding
  const cloudProviderSecret = {
    metadata: {
      namespace,
      name,
      secretRef,
      cloudProviderKind,
      cloudProfileName,
      dnsProviderName,
      projectName,
      hasCostObject
    },
    quotas
  }

  if (secret) {
    cloudProviderSecret.metadata = _
      .chain(secret.metadata)
      .pick(['resourceVersion'])
      .assign(cloudProviderSecret.metadata)
      .value()

    const iteratee = (value, key) => {
      value = decodeBase64(value)
      if (!_.includes(_.map(cleartextPropertyKeys, _.toLower), _.toLower(key))) {
        value = '****************'
      }
      return value
    }
    cloudProviderSecret.data = _.mapValues(secret.data, iteratee)

    const secretAccountKey = _.get(secret.data, 'serviceaccount.json')
    if (secretAccountKey) {
      cloudProviderSecret.data.project = projectId(secretAccountKey)
    }
  }

  return cloudProviderSecret
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
  metadata = { ...metadata.secretRef }
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw createError(422, 'Failed to encode "base64" secret data')
  }
  return { apiVersion, kind, metadata, type, data }
}

function toSecretBindingResource ({ metadata }) {
  const resource = Resources.SecretBinding
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const { name, secretRef, cloudProfileName, cloudProviderKind, dnsProviderName } = metadata
  const providerType = cloudProviderKind || dnsProviderName
  const labels = {}
  if (cloudProfileName) {
    labels['cloudprofile.garden.sapcloud.io/name'] = cloudProfileName
  }
  if (dnsProviderName) {
    labels['gardener.cloud/dnsProviderName'] = dnsProviderName
  }

  metadata = _
    .chain(metadata)
    .pick(['namespace'])
    .assign({ name, labels })
    .value()
  const secretBinding = { apiVersion, kind, metadata, secretRef }
  if (providerType) {
    secretBinding.provider = {
      type: providerType
    }
  }

  return secretBinding
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

async function getCloudProviderSecrets ({ secretBindings, cloudProfileList, secretList, namespace }) {
  const infrastructureSecrets = []
  for (const secretBinding of secretBindings) {
    try {
      const metadata = secretBinding.metadata || {}
      const labels = metadata.labels || {}
      const cloudProfileName = labels['cloudprofile.garden.sapcloud.io/name']
      const dnsProviderName = labels['gardener.cloud/dnsProviderName']
      const name = metadata.name
      const secretName = _.get(secretBinding, 'secretRef.name')
      const secretNamespace = _.get(secretBinding, 'secretRef.namespace', namespace)
      const cloudProfile = _.find(cloudProfileList, ['metadata.name', cloudProfileName])
      const cloudProviderKind = _.get(cloudProfile, 'metadata.cloudProviderKind')
      const projectInfo = getProjectNameAndHasCostObject(secretNamespace)
      if (cloudProfileName && !cloudProviderKind) {
        throw new Error(fmt('Could not determine cloud provider kind for cloud profile name %s. Skipping secretbinding with name %s', cloudProfileName, name))
      }
      if (!cloudProfileName && !dnsProviderName) {
        throw new Error(fmt('Secretbinding has no label that the dashboard recognizes. Skipping secretbinding with name %s', name))
      }

      const secret = _.find(secretList, ['metadata.name', secretName]) // pragma: whitelist secret
      if (isOwnSecret(secretBinding) && !secret) {
        throw new Error(fmt('Secret missing for secretbinding in own namespace. Skipping secretbinding with name %s', secretName))
      }
      const infrastructureSecret = fromResource({
        secretBinding,
        cloudProviderKind,
        secret,
        quotas: resolveQuotas(secretBinding),
        ...projectInfo
      })
      infrastructureSecrets.push(infrastructureSecret)
    } catch (err) {
      logger.info(err.message)
    }
  }
  return infrastructureSecrets
}

async function getCloudProviderKind (user, name) {
  const cloudProfile = await cloudprofiles.read({ user, name })
  return _.get(cloudProfile, 'metadata.cloudProviderKind')
}

/*
  The referenced secret can be from a different project to which the user has no access.
  Below we read the project from the cache without any authorization check.
  Only the name of project and the info if the project has a cost object is passed to the user.
  Since this is not sensitive information no authorization check is required.
*/
function getProjectNameAndHasCostObject (namespace) {
  const project = findProjectByNamespace(namespace)
  const projectName = _.get(project, 'metadata.name')
  const costObject = _.get(project, 'metadata.annotations["billing.gardener.cloud/costObject"]')
  const hasCostObject = !_.isEmpty(costObject)
  return { projectName, hasCostObject }
}

exports.list = async function ({ user, namespace }) {
  const client = user.client

  try {
    const [
      cloudProfileList,
      { items: secretList },
      { items: secretBindings }
    ] = await Promise.all([
      cloudprofiles.list({ user }),
      client.core.secrets.list(namespace, { labelSelector: 'reference.gardener.cloud/secretbinding=true' }),
      client['core.gardener.cloud'].secretbindings.list(namespace)
    ])

    return getCloudProviderSecrets({
      secretBindings,
      cloudProfileList,
      secretList,
      namespace
    })
  } catch (err) {
    logger.error(err)
    throw err
  }
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.client

  const metadata = body.metadata
  metadata.namespace = namespace
  metadata.secretRef = { namespace, name: metadata.name }
  const secret = await client.core.secrets.create(namespace, toSecretResource(body))

  let secretBinding
  try {
    secretBinding = await client['core.gardener.cloud'].secretbindings.create(namespace, toSecretBindingResource(body))
  } catch (err) {
    logger.error('failed to create SecretBinding, cleaning up secret %s/%s', namespace, secret.metadata.name)
    await client.core.secrets.delete(namespace, secret.metadata.name)

    throw err
  }

  const cloudProfileName = _.get(secretBinding, 'metadata.labels["cloudprofile.garden.sapcloud.io/name"]')
  let cloudProviderKind
  if (cloudProfileName) {
    cloudProviderKind = await getCloudProviderKind(user, cloudProfileName)
  }
  const projectInfo = getProjectNameAndHasCostObject(namespace)

  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding),
    ...projectInfo
  })
}

function isOwnSecret ({ metadata, secretRef }) {
  return secretRef.namespace === metadata.namespace
}

exports.patch = async function ({ user, namespace, name, body }) {
  const client = user.client

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(namespace, name)

  if (!isOwnSecret(secretBinding)) {
    throw createError(422, 'Patch allowed only for secrets in own namespace')
  }

  let { data } = body
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw createError(422, 'Failed to encode "base64" secret data')
  }

  const patchOperations = [{
    op: 'replace',
    path: '/data',
    value: data
  }]

  const secretRef = secretBinding.secretRef
  const secret = client.core.secrets.jsonPatch(secretRef.namespace, secretRef.name, patchOperations)

  const cloudProfileName = _.get(secretBinding, 'metadata.labels["cloudprofile.garden.sapcloud.io/name"]')
  let cloudProviderKind
  if (cloudProfileName) {
    cloudProviderKind = await getCloudProviderKind(user, cloudProfileName)
  }
  const projectInfo = getProjectNameAndHasCostObject(secretRef.namespace)

  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding),
    ...projectInfo
  })
}

exports.remove = async function ({ user, namespace, name }) {
  const client = user.client

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(namespace, name)

  if (!isOwnSecret(secretBinding)) {
    throw createError(422, 'Remove allowed only for secrets in own namespace')
  }

  const { items: shootList } = await shoots.list({ user, namespace })
  const secretReferencedByShoot = _.find(shootList, ['spec.secretBindingName', name])
  if (secretReferencedByShoot) {
    throw createError(422, 'Only secrets not referened by any shoot can be deleted')
  }

  const secretRef = secretBinding.secretRef
  await Promise.all([
    await client['core.gardener.cloud'].secretbindings.delete(namespace, name),
    await client.core.secrets.delete(secretRef.namespace, secretRef.name)
  ])
  return {
    metadata: {
      name,
      namespace,
      secretRef
    }
  }
}
