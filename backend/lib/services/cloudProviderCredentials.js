//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')
const { getQuotas } = require('../cache')
const createError = require('http-errors')
const logger = require('../logger')

exports.list = async function ({ user, params }) {
  const client = user.client
  const { bindingNamespace } = params

  const [
    { items: secretBindings },
    { items: secrets },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(bindingNamespace),
    client.core.secrets.list(bindingNamespace, { labelSelector: 'reference.gardener.cloud/secretbinding=true' }),
  ])

  const pickQuotaProperties = _.partialRight(_.pick, [
    'apiVersion',
    'kind',
    'metadata.name',
    'metadata.namespace',
    'metadata.uid',
    'spec.scope',
    'spec.clusterLifetimeDays',
  ])

  const quotas = _
    .chain(secretBindings)
    .flatMap(resolveQuotas)
    .uniqBy('metadata.uid')
    .filter('spec.clusterLifetimeDays')
    .map(pickQuotaProperties)
    .value()

  return {
    secretBindings,
    secrets,
    quotas,
  }
}

exports.create = async function ({ user, params }) {
  const client = user.client

  let { secret, secretBinding } = params
  const secretNamespace = secret.metadata.namespace
  const bindingNamespace = secretBinding.metadata.namespace
  const secretRefNamespace = secretBinding.secretRef.namespace

  if (bindingNamespace !== secretRefNamespace ||
    secretRefNamespace !== secretNamespace) {
    throw createError(422, 'Create allowed only for secrets in own namespace')
  }

  secret = await client.core.secrets.create(secretNamespace, secret)

  try {
    secretBinding = await client['core.gardener.cloud'].secretbindings.create(bindingNamespace, secretBinding)
  } catch (err) {
    logger.error('failed to create SecretBinding, cleaning up secret %s/%s', secret.metadata.namespace, secret.metadata.name)
    await client.core.secrets.delete(secret.metadata.namespace, secret.metadata.name)

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

  let { secret, secretBinding } = params
  const secretNamespace = secret.metadata.namespace
  const secretName = secret.metadata.name
  const bindingNamespace = secretBinding.metadata.namespace
  const secretBindingName = secretBinding.metadata.name
  const secretRefNamespace = secretBinding.secretRef.namespace

  secretBinding = await client['core.gardener.cloud'].secretbindings.get(bindingNamespace, secretBindingName)
  if (!secretBinding) {
    throw createError(404)
  }
  if (bindingNamespace !== secretRefNamespace ||
    secretRefNamespace !== secretNamespace) {
    throw createError(422, 'Patch allowed only for secrets in own namespace')
  }
  secret = await client.core.secrets.update(bindingNamespace, secretName, secret)

  return {
    secretBinding,
    secret,
    quotas: resolveQuotas(secretBinding),
  }
}

exports.remove = async function ({ user, params }) {
  const client = user.client
  const { bindingNamespace, secretBindingName } = params

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(bindingNamespace, secretBindingName)
  if (!secretBinding) {
    throw createError(404)
  }
  if (secretBinding.metadata.namespace !== secretBinding.secretRef.namespace) {
    throw createError(422, 'Remove allowed only for secrets in own namespace')
  }

  const secretRef = secretBinding.secretRef
  await Promise.all([
    await client['core.gardener.cloud'].secretbindings.delete(bindingNamespace, secretBindingName),
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
