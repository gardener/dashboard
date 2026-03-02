//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import createError, { isHttpError } from 'http-errors'
import cache from '../cache/index.js'
import logger from '../logger/index.js'
const { getQuotas } = cache

export async function list ({ user, params }) {
  const client = user.client
  const { namespace } = params

  const [
    { items: secretBindings },
    { items: credentialsBindings },
    { items: secrets },
    { items: workloadIdentities },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(namespace),
    client['security.gardener.cloud'].credentialsbindings.list(namespace),
    client.core.secrets.list(namespace),
    client['security.gardener.cloud'].workloadidentities.list(namespace),
  ])

  const hasProviderLabel = item => {
    const labels = item.metadata?.labels || {}
    return Object.entries(labels).some(([key, value]) => {
      if (key.startsWith('provider.shoot.gardener.cloud/') && value === 'true') {
        // The label results of the binding created together with the secret and is set by Gardener
        // used by infra credentials and old dns credentials that used to be created with bindings (before introduction of dnsProviderType label)
        return true
      }
      if (key === 'dashboard.gardener.cloud/dnsProviderType') {
        return true
      }
      return false
    })
  }

  const hasExtensionProviderLabel = item => {
    const labels = item.metadata?.labels || {}
    return Object.entries(labels).some(([key, value]) => {
      return key.startsWith('provider.extensions.gardener.cloud/') && value === 'true'
    })
  }

  const providerSecrets = secrets.filter(hasProviderLabel)
  const providerWorkloadIdentities = workloadIdentities.filter(hasExtensionProviderLabel)

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
    secrets: providerSecrets,
    workloadIdentities: providerWorkloadIdentities,
    quotas,
  }
}

export async function createDns ({ user, params }) {
  const client = user.client
  let { secret } = params
  const secretNamespace = secret.metadata.namespace

  secret = await client.core.secrets.create(secretNamespace, secret)

  return {
    secret,
  }
}

export async function createInfra ({ user, params }) {
  const client = user.client
  let { secret, binding } = params
  const secretNamespace = secret?.metadata.namespace

  const bindingNamespace = binding.metadata.namespace
  const kind = binding.kind

  let secretRefNamespace
  switch (kind) {
    case 'CredentialsBinding':
      secretRefNamespace = binding.credentialsRef.namespace
      break
    case 'SecretBinding':
      throw createError(422, 'Creating SecretBindings is no longer supported')
    default:
      throw createError(422, 'Unknown binding')
  }

  if (bindingNamespace !== secretRefNamespace ||
      (secret && secretNamespace !== secretRefNamespace)) {
    throw createError(422, 'Create only allowed if secret and credentialsbinding are in the same namespace')
  }

  if (secret) {
    // When creating credentialsbinding as replacement for deprecated secretbinding, the secret already exists
    secret = await client.core.secrets.create(secretNamespace, secret)
  }

  try {
    binding = await client['security.gardener.cloud'].credentialsbindings.create(bindingNamespace, binding)
  } catch (err) {
    if (secret) {
      logger.error('failed to create CredentialsBinding, cleaning up secret %s/%s', secret.metadata.namespace, secret.metadata.name)
      await client.core.secrets.delete(secret.metadata.namespace, secret.metadata.name)
    }
    throw err
  }

  return {
    binding,
    secret,
  }
}

export async function patchDns ({ user, params }) {
  const client = user.client

  let { secret } = params
  const secretNamespace = secret.metadata.namespace
  const secretName = secret.metadata.name

  secret = await client.core.secrets.update(secretNamespace, secretName, secret)
  return {
    secret,
  }
}

export async function patchInfra ({ user, params }) {
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

export async function removeDns ({ user, params }) {
  const client = user.client
  const { credentialKind, credentialNamespace, credentialName } = params

  try {
    switch (credentialKind) {
      case 'Secret':
        await client.core.secrets.delete(credentialNamespace, credentialName)
        removeOldDnsBindingIfExists(client, credentialNamespace, credentialName)
        break
      case 'WorkloadIdentity':
        await client['security.gardener.cloud'].workloadidentities.delete(credentialNamespace, credentialName)
        break
      default:
        throw createError(422, `Unknown credentialKind ${credentialKind}`)
    }
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }
}

async function removeOldDnsBindingIfExists (client, namespace, secretName) {
  const [
    { items: secretBindings },
    { items: credentialsBindings },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(namespace),
    client['security.gardener.cloud'].credentialsbindings.list(namespace),
  ])

  for (const binding of secretBindings) {
    if (binding.secretRef?.namespace === namespace && binding.secretRef?.name === secretName) {
      await client['core.gardener.cloud'].secretbindings.delete(binding.metadata.namespace, binding.metadata.name)
    }
  }

  for (const binding of credentialsBindings) {
    if (binding.credentialsRef?.namespace === namespace && binding.credentialsRef?.name === secretName) {
      await client['security.gardener.cloud'].credentialsbindings.delete(binding.metadata.namespace, binding.metadata.name)
    }
  }
}

export async function removeInfra ({ user, params }) {
  const client = user.client
  const { bindingKind, bindingNamespace, bindingName } = params

  let binding, credentialRefNamespace, credentialRefName, credentialKind
  switch (bindingKind) {
    case 'SecretBinding':
      binding = await client['core.gardener.cloud'].secretbindings.get(bindingNamespace, bindingName)
      credentialRefNamespace = binding.secretRef.namespace
      credentialRefName = binding.secretRef.name
      credentialKind = 'Secret'
      break
    case 'CredentialsBinding':
      binding = await client['security.gardener.cloud'].credentialsbindings.get(bindingNamespace, bindingName)
      credentialRefNamespace = binding.credentialsRef.namespace
      credentialRefName = binding.credentialsRef.name
      credentialKind = binding.credentialsRef.kind
      break
    default:
      throw createError(422, `Unknown binding ${bindingKind}`)
  }

  if (bindingNamespace !== credentialRefNamespace) {
    throw createError(422, `Delete allowed only if Secret and ${bindingKind} are in the same namespace`)
  }

  try {
    switch (credentialKind) {
      case 'Secret':
        await client.core.secrets.delete(credentialRefNamespace, credentialRefName)
        break
      case 'WorkloadIdentity':
        await client['security.gardener.cloud'].workloadidentities.delete(credentialRefNamespace, credentialRefName)
        break
      default:
        throw createError(422, `Unknown credentialKind ${credentialKind}`)
    }
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }

  switch (bindingKind) {
    case 'SecretBinding':
      binding = await client['core.gardener.cloud'].secretbindings.delete(bindingNamespace, bindingName)
      break
    case 'CredentialsBinding':
      binding = await client['security.gardener.cloud'].credentialsbindings.delete(bindingNamespace, bindingName)
      break
    default:
      throw createError(422, `Unknown binding ${bindingKind}`)
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
