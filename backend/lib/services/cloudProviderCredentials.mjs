//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')
const { isHttpError } = require('@gardener-dashboard/request')
const { getQuotas } = require('../cache')
const createError = require('http-errors')
const logger = require('../logger')

exports.list = async function ({ user, params }) {
  const client = user.client
  const { bindingNamespace } = params

  const [
    { items: secretBindings },
    { items: credentialsBindings },
    { items: secretBindingSecrets },
    { items: credentialsBindingSecrets },
    { items: workloadIdentities },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(bindingNamespace),
    client['security.gardener.cloud'].credentialsbindings.list(bindingNamespace),
    client.core.secrets.list(bindingNamespace, { labelSelector: 'reference.gardener.cloud/secretbinding=true' }),
    client.core.secrets.list(bindingNamespace, { labelSelector: 'reference.gardener.cloud/credentialsbinding=true' }),
    client['security.gardener.cloud'].workloadidentities.list(bindingNamespace),
  ])

  const secrets = [
    ...secretBindingSecrets,
    ...credentialsBindingSecrets,
  ]
  const quotas = _
    .chain([
      ...secretBindings,
      ...credentialsBindings,
    ])
    .flatMap(resolveQuotas)
    .uniqBy('metadata.uid')
    .value()

  return {
    secretBindings,
    credentialsBindings,
    secrets,
    workloadIdentities,
    quotas,
  }
}

exports.create = async function ({ user, params }) {
  const client = user.client

  let { secret, binding } = params
  const secretNamespace = secret.metadata.namespace
  const bindingNamespace = binding.metadata.namespace
  const kind = binding.kind

  let secretRefNamespace
  if (kind === 'CredentialsBinding') {
    secretRefNamespace = binding.credentialsRef.namespace
  } else if (kind === 'SecretBinding') {
    throw createError(422, 'Creating SecretBindings is no longer supported')
  } else {
    throw createError(422, 'Unknown binding')
  }
  if (bindingNamespace !== secretRefNamespace ||
    secretRefNamespace !== secretNamespace) {
    throw createError(422, 'Create allowed if secret and credentialsbinding are in the same namespace')
  }

  secret = await client.core.secrets.create(secretNamespace, secret)

  try {
    binding = await client['security.gardener.cloud'].credentialsbindings.create(bindingNamespace, binding)
  } catch (err) {
    logger.error('failed to create CredentialsBinding, cleaning up secret %s/%s', secret.metadata.namespace, secret.metadata.name)
    await client.core.secrets.delete(secret.metadata.namespace, secret.metadata.name)

    throw err
  }

  const quotas = resolveQuotas(binding)

  return {
    binding,
    secret,
    quotas,
  }
}

exports.patch = async function ({ user, params }) {
  const client = user.client

  let { secret } = params
  const secretNamespace = secret.metadata.namespace
  const secretName = secret.metadata.name

  try {
    secret = await client.core.secrets.update(secretNamespace, secretName, secret)
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
    secret = await client.core.secrets.create(secretNamespace, secret)
  }
  return {
    secret,
  }
}

exports.remove = async function ({ user, params }) {
  const client = user.client
  const { bindingKind, bindingNamespace, bindingName } = params

  let binding, secretRefNamespace, secretRefName
  if (bindingKind === 'SecretBinding') {
    binding = await client['core.gardener.cloud'].secretbindings.get(bindingNamespace, bindingName)
    secretRefNamespace = binding.secretRef.namespace
    secretRefName = binding.secretRef.name
  } else if (bindingKind === 'CredentialsBinding') {
    binding = await client['security.gardener.cloud'].credentialsbindings.get(bindingNamespace, bindingName)
    secretRefNamespace = binding.credentialsRef.namespace
    secretRefName = binding.credentialsRef.name
  } else {
    throw createError(422, `Unknown binding ${bindingKind}`)
  }
  if (bindingNamespace !== secretRefNamespace) {
    throw createError(422, `Delete allowed only if Secret and ${bindingKind} are in the same namespace`)
  }

  try {
    await client.core.secrets.delete(bindingNamespace, secretRefName)
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }
  if (bindingKind === 'SecretBinding') {
    await client['core.gardener.cloud'].secretbindings.delete(bindingNamespace, bindingName)
  }
  if (bindingKind === 'CredentialsBinding') {
    await client['security.gardener.cloud'].credentialsbindings.delete(bindingNamespace, bindingName)
  }
}

function resolveQuotas (binding) {
  const pickQuotaProperties = _.partialRight(_.pick, [
    'apiVersion',
    'kind',
    'metadata.name',
    'metadata.namespace',
    'metadata.uid',
    'spec.scope',
    'spec.clusterLifetimeDays',
  ])

  const quotas = getQuotas()
  const findQuota = ({ namespace, name } = {}) => _.find(quotas, ({ metadata }) => metadata.namespace === namespace && metadata.name === name)
  try {
    return _
      .chain(binding.quotas)
      .map(findQuota)
      .compact()
      .filter('spec.clusterLifetimeDays')
      .map(pickQuotaProperties)
      .value()
  } catch (err) {
    return []
  }
}
