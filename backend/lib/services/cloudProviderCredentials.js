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

  const quotas = _
    .chain([...secretBindings, ...credentialsBindings])
    .flatMap(resolveQuotas)
    .uniqBy('metadata.uid')
    .value()

  return {
    secretBindings,
    credentialsBindings,
    secrets: [...secretBindingSecrets, ...credentialsBindingSecrets],
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

  return {
    binding,
    secret,
    quotas: resolveQuotas(binding),
  }
}

exports.patch = async function ({ user, params }) {
  const client = user.client

  let { secret, binding } = params
  const secretNamespace = secret.metadata.namespace
  const secretName = secret.metadata.name
  const bindingNamespace = binding.metadata.namespace
  const bindingName = binding.metadata.name
  const kind = binding.kind

  let secretRefNamespace
  if (kind === 'SecretBinding') {
    secretRefNamespace = binding.secretRef.namespace
    binding = await client['core.gardener.cloud'].secretbindings.get(bindingNamespace, bindingName)
    if (!binding) {
      throw createError(404)
    }
  } else if (kind === 'CredentialsBinding') {
    secretRefNamespace = binding.credentialsRef.namespace
    binding = await client['security.gardener.cloud'].credentialsbindings.get(bindingNamespace, bindingName)
    if (!binding) {
      throw createError(404)
    }
  } else {
    throw createError(422, 'Unknown binding kind')
  }
  if (bindingNamespace !== secretRefNamespace ||
    secretRefNamespace !== secretNamespace) {
    throw createError(422, `Patch allowed only if Secret and ${kind} are in the same namespace`)
  }
  secret = await client.core.secrets.update(bindingNamespace, secretName, secret)

  return {
    binding,
    secret,
    quotas: resolveQuotas(binding),
  }
}

exports.remove = async function ({ user, params }) {
  const client = user.client
  const { binding: { kind, metadata: { namespace: bindingNamespace, name: bindingName } } } = params

  const [
    { items: secretBindings },
    { items: credentialsBindings },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(bindingNamespace),
    client['security.gardener.cloud'].credentialsbindings.list(bindingNamespace),
  ])

  const promiseFns = []
  let secretName, secretNamespace
  if (kind === 'CredentialsBinding') {
    const credentialsBinding = _.find(credentialsBindings, ['metadata.name', bindingName])
    secretName = credentialsBinding.credentialsRef.name
    secretNamespace = credentialsBinding.credentialsRef.namespace
    promiseFns.push(() => client['security.gardener.cloud'].credentialsbindings.delete(bindingNamespace, bindingName))
  } else if (kind === 'SecretBinding') {
    const secretBinding = _.find(secretBindings, ['metadata.name', bindingName])
    secretName = secretBinding.secretRef.name
    secretNamespace = secretBinding.secretRef.namespace
    promiseFns.push(() => client['core.gardener.cloud'].secretbindings.delete(bindingNamespace, bindingName))
  } else {
    throw createError(422, 'Unknown binding')
  }

  if (bindingNamespace !== secretNamespace) {
    throw createError(422, `Remove allowed only if secret and ${kind} are in the same namespace`)
  }

  const refs = [
    ..._.map(secretBindings, 'secretRef'),
    ..._.map(credentialsBindings, 'credentialsRef'),
  ]
  const referencedSecretCount = _.filter(refs, { namespace: secretNamespace, name: secretName }).length
  if (referencedSecretCount === 1) {
    promiseFns.push(() => client.core.secrets.delete(secretNamespace, secretName))
  }

  await Promise.all(promiseFns.map(fn => fn()))
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
