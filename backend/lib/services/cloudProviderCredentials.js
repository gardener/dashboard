//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')
const { getQuotas } = require('../cache')
const { Resources } = require('@gardener-dashboard/kube-client')
const { encodeBase64 } = require('../utils')
const createError = require('http-errors')
const logger = require('../logger')

exports.list = async function ({ user, params }) {
  const client = user.client
  const { secretBindingNamespace } = params

  const [
    { items: secretBindings },
    { items: referencedSecrets },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(secretBindingNamespace),
    client.core.secrets.list(secretBindingNamespace, { labelSelector: 'reference.gardener.cloud/secretbinding=true' }),
  ])

  const secretMap = new Map(referencedSecrets.map(secret => [secret.metadata.name, secret]))
  const credentialsList = secretBindings.map(secretBinding => {
    const secret = secretMap.get(secretBinding.secretRef.name)

    return {
      secretBinding,
      secret,
      quotas: resolveQuotas(secretBinding),
    }
  })

  return credentialsList
}

exports.create = async function ({ user, params }) {
  const client = user.client
  const {
    secretBindingNamespace,
    secretBindingName,
    secretBindingNamespace: secretNamespace,
    secretBindingName: secretName,
    poviderType,
    secretData,
  } = params

  const secretResource = toSecretResource({ namespace: secretNamespace, name: secretName, data: secretData })
  const secret = await client.core.secrets.create(secretNamespace, secretResource)

  let secretBinding
  try {
    const secretRef = { namespace: secret.metadata.namespace, name: secret.metadata.name }
    const secretBindingResource = toSecretBindingResource({ namespace: secretBindingNamespace, name: secretBindingName, poviderType, secretRef })
    secretBinding = await client['core.gardener.cloud'].secretbindings.create(secretBindingNamespace, secretBindingResource)
  } catch (err) {
    logger.error('failed to create SecretBinding, cleaning up secret %s/%s', secret.metadata.namespace, secret.metadata.name)
    await client.core.secrets.delete(secretNamespace, secret.metadata.name)

    throw err
  }

  return {
    secretBinding,
    secret,
    quotas: resolveQuotas(secretBinding),
  }
}

exports.patch = async function ({ user, params }) {
  const client = user.client
  const {
    secretBindingNamespace,
    secretBindingName,
    secretData,
  } = params
  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(secretBindingNamespace, secretBindingName)

  let data
  try {
    data = _.mapValues(secretData, encodeBase64)
  } catch (err) {
    throw createError(422, 'Failed to encode "base64" secret data')
  }

  const patchOperations = [{
    op: 'replace',
    path: '/data',
    value: data,
  }]

  const secretRef = secretBinding.secretRef
  const secret = await client.core.secrets.jsonPatch(secretRef.namespace, secretRef.name, patchOperations)

  return {
    secretBinding,
    secret,
    quotas: resolveQuotas(secretBinding),
  }
}

exports.remove = async function ({ user, params }) {
  const client = user.client
  const { secretBindingNamespace, secretBindingName } = params

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(secretBindingNamespace, secretBindingName)

  const secretRef = secretBinding.secretRef
  await Promise.all([
    await client['core.gardener.cloud'].secretbindings.delete(secretBindingNamespace, secretBindingName),
    await client.core.secrets.delete(secretRef.namespace, secretRef.name),
  ])
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

function toSecretResource ({ namespace, name, data }) {
  const resource = Resources.Secret
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const type = 'Opaque'
  const metadata = {
    namespace,
    name,
  }
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw createError(422, 'Failed to encode "base64" secret data')
  }
  return { apiVersion, kind, metadata, type, data }
}

function toSecretBindingResource ({ namespace, name, poviderType, secretRef }) {
  const resource = Resources.SecretBinding
  const apiVersion = resource.apiVersion
  const kind = resource.kind

  const metadata = {
    namespace,
    name,
  }

  const provider = {
    type: poviderType,
  }

  return { apiVersion, kind, metadata, secretRef, provider }
}
