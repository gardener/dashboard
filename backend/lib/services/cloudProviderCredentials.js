//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import createError from 'http-errors'
import requestModule from '@gardener-dashboard/request'
import cache from '../cache/index.js'
import logger from '../logger/index.js'
const { isHttpError } = requestModule
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

  const hasCloudProviderSecretLabel = item => {
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

  const hasCloudProviderWorkloadIdentityLabel = item => {
    const labels = item.metadata?.labels || {}
    return Object.entries(labels).some(([key, value]) => {
      // The label results of the binding created together with the secret and is set by Gardener
      // used by infra credentials
      if (key.startsWith('provider.extensions.gardener.cloud/') && value === 'true') {
        return true
      }
      if (key === 'dashboard.gardener.cloud/dnsProviderType') {
        return true
      }
      return false
    })
  }

  const providerSecrets = secrets.filter(hasCloudProviderSecretLabel)
  const providerWorkloadIdentities = workloadIdentities.filter(hasCloudProviderWorkloadIdentityLabel)

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
  let { secret } = validateSecret(params)
  const secretNamespace = secret.metadata.namespace

  secret = await client.core.secrets.create(secretNamespace, secret)

  return {
    secret,
  }
}

export async function createInfra ({ user, params }) {
  const client = user.client
  let { binding } = params
  validateCredentialsBinding(binding)

  const bindingNamespace = binding.metadata.namespace
  const credentialsRef = binding.credentialsRef
  const credentialNamespace = credentialsRef.namespace ?? bindingNamespace
  let secret

  if (params.secret === undefined) {
    await validateSecretBindingMigration(client, binding)
  } else {
    ({ secret } = validateSecret(params))
    validateBindingSecret(binding, secret)
  }

  if (secret) {
    secret = await client.core.secrets.create(credentialNamespace, secret)
  }

  try {
    binding = await client['security.gardener.cloud'].credentialsbindings.create(bindingNamespace, binding)
  } catch (err) {
    if (secret) {
      logger.error('failed to create CredentialsBinding, cleaning up secret %s/%s', secret.metadata.namespace, secret.metadata.name)
      try {
        await client.core.secrets.delete(secret.metadata.namespace, secret.metadata.name)
      } catch (cleanupError) {
        logger.error('failed to clean up Secret %s/%s after CredentialsBinding creation failed: %s', secret.metadata.namespace, secret.metadata.name, cleanupError.message)
        err.message += `. The newly created Secret ${secret.metadata.namespace}/${secret.metadata.name} could not be cleaned up. Review it before retrying: ${cleanupError.message}`
      }
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

  let { secret } = validateSecret(params)
  const secretNamespace = secret.metadata.namespace
  const secretName = secret.metadata.name

  secret = await client.core.secrets.update(secretNamespace, secretName, secret)
  return {
    secret,
  }
}

export async function patchInfra ({ user, params }) {
  const client = user.client

  let { secret } = validateSecret(params)
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
  const descriptor = descriptorForKind(credentialKind)

  try {
    await descriptor.client(client).delete(credentialNamespace, credentialName)
    if (credentialKind === 'Secret') {
      await removeOldDnsBindingIfExists(client, credentialNamespace, credentialName)
    }
  } catch (err) {
    if (!isHttpError(err, 404)) {
      throw err
    }
  }
}

export async function removeInfra ({ user, params }) {
  const client = user.client
  const { bindingKind, bindingNamespace, bindingName } = params
  const bindingClient = bindingClientFor(client, bindingKind)

  let binding = await bindingClient.get(bindingNamespace, bindingName)
  const credentialRef = resolveBindingCredentialReference(binding)
  if (!credentialRef?.apiVersion || !credentialRef.kind || !credentialRef.name || !credentialRef.namespace) {
    throw createError(422, `${bindingKind} does not contain a complete credential reference`)
  }
  const { namespace: credentialRefNamespace } = credentialRef

  if (bindingNamespace !== credentialRefNamespace) {
    throw createError(422, `Delete allowed only if credential and ${bindingKind} are in the same namespace`)
  }

  const descriptor = descriptorForCredentialReference(credentialRef)
  // Delete the binding first. Gardener's admission webhooks are authoritative
  // for whether it is still in use. This also ensures that a rejected binding
  // deletion never leaves the binding without its credential.
  binding = await bindingClient.delete(bindingNamespace, bindingName)

  const credentialDeletion = params.preserveCredential === true
    ? {
        credentialDeleted: false,
        credentialMissing: false,
        credentialPreservedReason: 'Only binding deletion was requested',
      }
    : await requestCredentialDeletion({ client, descriptor, credentialRef })

  return removeInfraResponse(binding, credentialRef, credentialDeletion)
}

function validateSecret (params) {
  const secret = params?.secret
  if (!secret || secret.apiVersion !== 'v1' || secret.kind !== 'Secret') {
    throw createError(422, 'secret must be v1, Kind=Secret')
  }
  if (!secret.metadata?.namespace || !secret.metadata?.name) {
    throw createError(422, 'Secret metadata.name and metadata.namespace are required')
  }
  return { secret }
}

function validateCredentialsBinding (binding) {
  if (!binding?.metadata?.namespace || !binding.metadata.name) {
    throw createError(422, 'CredentialsBinding metadata.name and metadata.namespace are required')
  }
  if (binding.kind === 'SecretBinding') {
    throw createError(422, 'Creating SecretBindings is no longer supported')
  }
  if (binding.kind !== 'CredentialsBinding') {
    throw createError(422, 'A CredentialsBinding is required')
  }
  if (binding.apiVersion !== 'security.gardener.cloud/v1alpha1') {
    throw createError(422, 'CredentialsBinding must use security.gardener.cloud/v1alpha1')
  }
  const ref = binding.credentialsRef
  if (!ref?.apiVersion || !ref.kind || !ref.name) {
    throw createError(422, 'CredentialsBinding must contain a complete credentialsRef')
  }
  if (ref.apiVersion !== 'v1' || ref.kind !== 'Secret') {
    throw createError(422, 'CredentialsBinding credentialsRef must reference a v1 Secret')
  }
  if ((ref.namespace ?? binding.metadata.namespace) !== binding.metadata.namespace) {
    throw createError(422, 'Creation is only allowed when the Secret and CredentialsBinding are in the same namespace')
  }
}

function validateBindingSecret (binding, secret) {
  const ref = binding.credentialsRef
  const refNamespace = ref.namespace ?? binding.metadata.namespace
  const { namespace, name } = secret.metadata
  if (ref.apiVersion !== secret.apiVersion || ref.kind !== secret.kind || ref.name !== name || refNamespace !== namespace) {
    throw createError(422, 'Secret and CredentialsBinding credentialsRef must have matching API version, kind, name and namespace')
  }
}

async function validateSecretBindingMigration (client, binding) {
  let source
  try {
    source = await client['core.gardener.cloud'].secretbindings.get(binding.metadata.namespace, binding.metadata.name)
  } catch (err) {
    if (isHttpError(err, 404)) {
      throw createError(422, 'Credential-less creation is only supported when migrating an existing same-name SecretBinding')
    }
    throw err
  }
  if (source?.kind !== 'SecretBinding' ||
      source.metadata?.namespace !== binding.metadata.namespace ||
      source.metadata?.name !== binding.metadata.name) {
    throw createError(422, 'Credential-less creation is only supported when migrating an existing same-name SecretBinding')
  }
  const sourceProviderType = typeof source.provider === 'string' ? source.provider : source.provider?.type
  const targetProviderType = typeof binding.provider === 'string' ? binding.provider : binding.provider?.type
  if (!sameCredentialReference(resolveBindingCredentialReference(source), resolveBindingCredentialReference(binding)) || sourceProviderType !== targetProviderType) {
    throw createError(422, 'CredentialsBinding must preserve the provider and Secret reference of the migrated SecretBinding')
  }
}

function bindingClientFor (client, bindingKind) {
  switch (bindingKind) {
    case 'SecretBinding':
      return client['core.gardener.cloud'].secretbindings
    case 'CredentialsBinding':
      return client['security.gardener.cloud'].credentialsbindings
    default:
      throw createError(422, `Unknown binding ${bindingKind}`)
  }
}

function descriptorForKind (kind) {
  switch (kind) {
    case 'Secret':
      return { kind, client: client => client.core.secrets }
    case 'WorkloadIdentity':
      return { kind, client: client => client['security.gardener.cloud'].workloadidentities }
    default:
      throw createError(422, `Unknown credentialKind ${kind}`)
  }
}

function descriptorForCredentialReference ({ apiVersion, kind }) {
  if (apiVersion === 'v1' && kind === 'Secret') {
    return { kind, client: client => client.core.secrets }
  }
  if (apiVersion === 'security.gardener.cloud/v1alpha1' && kind === 'WorkloadIdentity') {
    return { kind, client: client => client['security.gardener.cloud'].workloadidentities }
  }
  throw createError(422, `Unknown credential reference ${apiVersion}, Kind=${kind}`)
}

async function requestCredentialDeletion ({ client, descriptor, credentialRef }) {
  const { namespace, name } = credentialRef
  try {
    await descriptor.client(client).delete(namespace, name)
    return { credentialDeleted: true, credentialMissing: false }
  } catch (err) {
    if (isHttpError(err, 403) || isHttpError(err, 409)) {
      return {
        credentialDeleted: false,
        credentialMissing: false,
        credentialPreservedReason: `Gardener did not allow credential deletion: ${err.message}`,
      }
    }
    if (isHttpError(err, 404)) {
      return { credentialDeleted: false, credentialMissing: true }
    }
    return {
      credentialDeleted: false,
      credentialMissing: false,
      credentialDeletionUnconfirmed: true,
      credentialDeletionError: err.message,
    }
  }
}

function removeInfraResponse (binding, credentialRef, credentialDeletion) {
  const {
    credentialDeleted,
    credentialMissing,
    credentialDeletionUnconfirmed = false,
    credentialDeletionError,
    credentialPreservedReason,
  } = credentialDeletion
  return {
    binding,
    credentialRef,
    credentialDeleted,
    credentialMissing,
    credentialDeletionUnconfirmed,
    credentialDeletionError,
    credentialPreserved: !credentialMissing && Boolean(credentialPreservedReason),
    credentialPreservedReason,
  }
}

function resolveBindingCredentialReference (binding) {
  if (binding.kind === 'SecretBinding') {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      namespace: binding.secretRef?.namespace ?? binding.metadata?.namespace,
      name: binding.secretRef?.name,
    }
  }
  if (binding.kind === 'CredentialsBinding') {
    return {
      apiVersion: binding.credentialsRef?.apiVersion,
      kind: binding.credentialsRef?.kind,
      namespace: binding.credentialsRef?.namespace ?? binding.metadata?.namespace,
      name: binding.credentialsRef?.name,
    }
  }
}

function sameCredentialReference (left, right) {
  return left?.apiVersion === right?.apiVersion && left?.kind === right?.kind && left?.namespace === right?.namespace && left?.name === right?.name
}

async function removeOldDnsBindingIfExists (client, namespace, secretName) {
  const [
    { items: secretBindings },
    { items: credentialsBindings },
  ] = await Promise.all([
    client['core.gardener.cloud'].secretbindings.list(namespace),
    client['security.gardener.cloud'].credentialsbindings.list(namespace),
  ])

  const credentialRef = {
    apiVersion: 'v1',
    kind: 'Secret',
    namespace,
    name: secretName,
  }

  for (const binding of [...secretBindings, ...credentialsBindings]) {
    if (sameCredentialReference(resolveBindingCredentialReference(binding), credentialRef)) {
      await bindingClientFor(client, binding.kind).delete(binding.metadata.namespace, binding.metadata.name)
    }
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
