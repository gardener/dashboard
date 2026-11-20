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
  const descriptor = resolveCredential(params)
  const namespace = descriptor.resource.metadata.namespace
  const credential = await descriptor.client(client).create(namespace, descriptor.resource)

  return { [descriptor.key]: credential }
}

export async function createInfra ({ user, params }) {
  const client = user.client
  const { binding } = params
  validateCredentialsBinding(binding)

  const { namespace } = binding.metadata
  const bindings = client['security.gardener.cloud'].credentialsbindings
  const descriptor = resolveCredential(params, { optional: true })
  if (!descriptor) {
    await validateSecretBindingMigration(client, binding)
    return { binding: await bindings.create(namespace, binding) }
  }

  validateBindingCredential(binding, descriptor)
  const credentials = descriptor.client(client)
  const credential = await credentials.create(namespace, descriptor.resource)
  try {
    const createdBinding = await bindings.create(namespace, binding)
    return { binding: createdBinding, [descriptor.key]: credential }
  } catch (err) {
    await rollbackCredentialCreation({ bindings, binding, credentials, credential, error: err })
    throw err
  }
}

export async function patchDns ({ user, params }) {
  const client = user.client
  const descriptor = resolveCredential(params)
  const credential = await updateCredential(client, descriptor)
  return { [descriptor.key]: credential }
}

export async function patchInfra ({ user, params }) {
  const client = user.client
  const descriptor = resolveCredential(params)
  const { namespace } = descriptor.resource.metadata

  try {
    const credential = await updateCredential(client, descriptor)
    return { [descriptor.key]: credential }
  } catch (err) {
    if (descriptor.kind !== 'Secret' || !isHttpError(err, 404)) {
      throw err
    }
    // Preserve the legacy orphaned Secret recovery flow. WorkloadIdentities are
    // identity-bearing resources and must never be recreated on update.
    const secret = await descriptor.client(client).create(namespace, descriptor.resource)
    return { secret }
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
  if (!isCompleteCredentialReference(credentialRef)) {
    throw createError(422, `${bindingKind} does not contain a complete credential reference`)
  }
  const { namespace: credentialRefNamespace } = credentialRef

  if (bindingNamespace !== credentialRefNamespace) {
    throw createError(422, `Delete allowed only if credential and ${bindingKind} are in the same namespace`)
  }

  const descriptor = descriptorForCredentialReference(credentialRef)
  // Delete the binding first so Gardener can release reference protection on
  // the credential. Finalizers may keep referenced resources in Terminating
  // until their remaining references are removed.
  binding = await bindingClient.delete(bindingNamespace, bindingName)

  const credentialDeletion = params.preserveCredential === true
    ? {
        credentialDeletionRequested: false,
        credentialMissing: false,
        credentialPreservedReason: 'Only binding deletion was requested',
      }
    : await requestCredentialDeletion({ client, descriptor, credentialRef })

  return removeInfraResponse(binding, credentialRef, credentialDeletion)
}

async function bindingMayReferenceCredential (bindings, binding) {
  const { namespace, name } = binding.metadata
  try {
    const existing = await bindings.get(namespace, name)
    const ref = resolveBindingCredentialReference(existing)
    if (!isCompleteCredentialReference(ref)) {
      return true
    }
    return sameCredentialReference(ref, resolveBindingCredentialReference(binding))
  } catch (err) {
    if (isHttpError(err, 404)) {
      return false
    }
    logger.error('failed to verify CredentialsBinding %s/%s after its creation failed; retaining the credential: %s', namespace, name, err.message)
    return true
  }
}

async function rollbackCredentialCreation ({ bindings, binding, credentials, credential, error }) {
  if (await bindingMayReferenceCredential(bindings, binding)) {
    return
  }

  const { namespace, name, uid } = credential.metadata
  const description = `${credential.kind} ${namespace}/${name}`
  if (!uid) {
    error.message += `. Retained ${description} because the create response omitted its UID`
    return
  }

  try {
    await credentials.delete(namespace, name, { preconditions: { uid } })
  } catch (err) {
    if (isHttpError(err, 404)) {
      return
    }
    logger.error('failed to clean up %s after CredentialsBinding creation failed: %s', description, err.message)
    error.message += `. The newly created ${description} could not be cleaned up. Review it before retrying: ${err.message}`
  }
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
  descriptorForCredentialReference(ref)
  if ((ref.namespace ?? binding.metadata.namespace) !== binding.metadata.namespace) {
    throw createError(422, 'Creation is only allowed when the credential and CredentialsBinding are in the same namespace')
  }
}

function validateBindingCredential (binding, descriptor) {
  const ref = binding.credentialsRef
  const refNamespace = ref.namespace ?? binding.metadata.namespace
  const { namespace, name } = descriptor.resource.metadata
  if (ref.apiVersion !== descriptor.apiVersion || ref.kind !== descriptor.kind || ref.name !== name || refNamespace !== namespace) {
    throw createError(422, 'Credential and CredentialsBinding credentialsRef must have matching API version, kind, name and namespace')
  }
}

async function validateSecretBindingMigration (client, binding) {
  if (binding.credentialsRef.kind !== 'Secret') {
    throw createError(422, 'A credential resource is required for this CredentialsBinding')
  }
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
  const hasSameCredentialReference = sameCredentialReference(
    resolveBindingCredentialReference(source),
    resolveBindingCredentialReference(binding),
  )
  const hasSameProviderType = source.provider?.type === binding.provider?.type
  if (!hasSameCredentialReference || !hasSameProviderType) {
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

const credentialDescriptors = {
  secret: {
    key: 'secret',
    kind: 'Secret',
    apiVersion: 'v1',
    client: client => client.core.secrets,
  },
  workloadIdentity: {
    key: 'workloadIdentity',
    kind: 'WorkloadIdentity',
    apiVersion: 'security.gardener.cloud/v1alpha1',
    client: client => client['security.gardener.cloud'].workloadidentities,
  },
}

function descriptorForKind (kind) {
  const descriptor = Object.values(credentialDescriptors).find(item => item.kind === kind)
  if (!descriptor) {
    throw createError(422, `Unknown credentialKind ${kind}`)
  }
  return descriptor
}

function descriptorForCredentialReference ({ apiVersion, kind }) {
  const descriptor = descriptorForKind(kind)
  if (descriptor.apiVersion === apiVersion) {
    return descriptor
  }
  throw createError(422, `Unknown credential reference ${apiVersion}, Kind=${kind}`)
}

function resolveCredential (params, { optional = false } = {}) {
  const resources = []
  if (params?.secret !== undefined) {
    resources.push([credentialDescriptors.secret, params.secret])
  }
  if (params?.workloadIdentity !== undefined) {
    resources.push([credentialDescriptors.workloadIdentity, params.workloadIdentity])
  }

  if (resources.length > 1) {
    throw createError(422, 'Provide exactly one credential resource')
  }
  if (resources.length === 0) {
    if (optional) {
      return undefined
    }
    throw createError(422, 'A credential resource is required')
  }

  const [descriptor, resource] = resources[0]
  if (!resource || resource.kind !== descriptor.kind || resource.apiVersion !== descriptor.apiVersion) {
    throw createError(422, `${descriptor.key} must be ${descriptor.apiVersion}, Kind=${descriptor.kind}`)
  }
  if (!resource.metadata?.namespace || !resource.metadata?.name) {
    throw createError(422, `${descriptor.kind} metadata.name and metadata.namespace are required`)
  }
  return { ...descriptor, resource }
}

async function updateCredential (client, descriptor) {
  const { namespace, name, resourceVersion } = descriptor.resource.metadata
  if (descriptor.kind !== 'WorkloadIdentity') {
    return descriptor.client(client).update(namespace, name, descriptor.resource)
  }
  if (!resourceVersion) {
    throw createError(422, 'WorkloadIdentity metadata.resourceVersion is required for update')
  }

  const current = await descriptor.client(client).get(namespace, name)
  if (current.metadata?.deletionTimestamp) {
    throw createError(409, `WorkloadIdentity ${namespace}/${name} is already marked for deletion`)
  }
  validateWorkloadIdentityUpdate(current, descriptor.resource)
  const resource = _.cloneDeep(descriptor.resource)
  resource.metadata.uid = current.metadata?.uid
  resource.status = current.status
  return descriptor.client(client).update(namespace, name, resource)
}

function validateWorkloadIdentityUpdate (current, draft) {
  const target = current.spec?.targetSystem
  const updatedTarget = draft.spec?.targetSystem
  if (target?.type !== updatedTarget?.type) {
    throw createError(422, 'WorkloadIdentity target system type cannot be changed')
  }
  if (current.metadata?.uid && draft.metadata.uid !== current.metadata.uid) {
    throw createError(422, 'WorkloadIdentity UID cannot be changed')
  }
  if (current.status?.sub && draft.status?.sub !== current.status.sub) {
    throw createError(422, 'WorkloadIdentity subject cannot be changed')
  }

  for (const field of immutableProviderFields(target?.type)) {
    const original = _.get(target?.providerConfig, field)
    const updated = _.get(updatedTarget?.providerConfig, field)
    if (!_.isEqual(original, updated)) {
      throw createError(422, `WorkloadIdentity ${field} cannot be changed`)
    }
  }
}

// Provider-specific fields mirror immutableOnEdit in the frontend vendor definitions.
function immutableProviderFields (type) {
  switch (type) {
    case 'azure': return ['apiVersion', 'kind', 'tenantID', 'subscriptionID']
    case 'gcp': return ['apiVersion', 'kind', 'projectID']
    default: return ['apiVersion', 'kind']
  }
}

async function requestCredentialDeletion ({ client, descriptor, credentialRef }) {
  const { namespace, name } = credentialRef
  try {
    await descriptor.client(client).delete(namespace, name)
    return { credentialDeletionRequested: true, credentialMissing: false }
  } catch (err) {
    if (isHttpError(err, 403) || isHttpError(err, 409)) {
      return {
        credentialDeletionRequested: false,
        credentialMissing: false,
        credentialPreservedReason: `Gardener did not allow credential deletion: ${err.message}`,
      }
    }
    if (isHttpError(err, 404)) {
      return { credentialDeletionRequested: false, credentialMissing: true }
    }
    return {
      credentialDeletionRequested: false,
      credentialMissing: false,
      credentialDeletionUnconfirmed: true,
      credentialDeletionError: err.message,
    }
  }
}

function removeInfraResponse (binding, credentialRef, credentialDeletion) {
  const {
    credentialDeletionRequested,
    credentialMissing,
    credentialDeletionUnconfirmed = false,
    credentialDeletionError,
    credentialPreservedReason,
  } = credentialDeletion
  return {
    binding,
    credentialRef,
    credentialDeletionRequested,
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
  return left?.apiVersion === right?.apiVersion &&
    left?.kind === right?.kind &&
    left?.namespace === right?.namespace &&
    left?.name === right?.name
}

function isCompleteCredentialReference (ref) {
  return Boolean(ref?.apiVersion && ref.kind && ref.name && ref.namespace)
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
