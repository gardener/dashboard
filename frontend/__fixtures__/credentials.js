//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function createProviderCredentials (type, options = {}) {
  const {
    name = type,
    projectName = 'test',
    secretNamepace = `garden-${projectName}`,
    quotas = [],
    typeWorkloadIdentity = false,
    typeSecret = !typeWorkloadIdentity,
    createSecretBinding = typeSecret,
    createCredentialsBinding = true,
  } = options
  const secretBindingName = `${name}-secretbinding`
  const credentialsBindingName = `${name}-credentialsbinding`
  const bindingNamespace = `garden-${projectName}`
  const secretName = `${name}-secret`
  const workloadIdentityName = `${name}-workloadidentity`
  const quotaName = `${name}-quota`

  if (secretNamepace !== bindingNamespace) {
    // always add default quota if secret is in different namespace (trial quota)
    quotas.push({
      metadata: {
        name: quotaName,
        namespace: secretNamepace,
      },
      spec: {
        scope: {
          kind: 'Project',
          apiVersion: 'core.gardener.cloud/v1beta1',
        },
        clusterLifetimeDays: 7,
      },
    })
  }

  let secretBinding
  if (createSecretBinding) {
    secretBinding = {
      metadata: {
        namespace: bindingNamespace,
        name: secretBindingName,
        uid: `sb-${name}-uid`,
      },
      provider: {
        type,
      },
      secretRef: {
        name: secretName,
        namespace: secretNamepace,
      },
    }
    if (quotas.length > 0) {
      secretBinding.quotas = quotas.map(({ metadata }) => metadata)
    }
  }
  let credentialsBinding
  if (createCredentialsBinding) {
    let kind
    let name
    if (typeSecret) {
      kind = 'Secret'
      name = secretName
    } else if (typeWorkloadIdentity) {
      kind = 'WorkloadIdentity'
      name = workloadIdentityName
    }
    credentialsBinding = {
      metadata: {
        namespace: bindingNamespace,
        name: credentialsBindingName,
        uid: `cb-${name}-uid`,
      },
      provider: {
        type,
      },
      credentialsRef: {
        kind,
        name,
        namespace: secretNamepace,
      },
    }
    if (quotas.length > 0) {
      credentialsBinding.quotas = quotas.map(({ metadata }) => metadata)
    }
  }

  let secret
  if (typeSecret && secretNamepace === bindingNamespace) {
    // no secret if referenced in other namespace
    const labels = {
      [`provider.shoot.gardener.cloud/${type}`]: 'true',
    }
    secret = {
      metadata: {
        namespace: secretNamepace,
        name: secretName,
        uid: `secret-${name}-uid`,
        labels,
      },
      data: {
        secret: 'cw==',
      },
    }
  }

  let workloadIdentity
  if (typeWorkloadIdentity && secretNamepace === bindingNamespace) {
    // no workloadidenetity if referenced in other namespace
    const labels = {
      [`provider.shoot.gardener.cloud/${type}`]: 'true',
    }
    workloadIdentity = {
      metadata: {
        namespace: secretNamepace,
        name: workloadIdentityName,
        uid: `wlid-${name}-uid`,
        labels,
      },
      spec: {
        targetSystem: {
          type: 'foo-infra',
        },
      },
    }
  }

  return {
    secretBinding,
    credentialsBinding,
    secret,
    workloadIdentity,
    quotas,
  }
}

const credentials = [
  // infra credentials
  createProviderCredentials('alicloud'),
  createProviderCredentials('aws'),
  createProviderCredentials('aws', { name: 'aws-wlid', typeWorkloadIdentity: true }),
  createProviderCredentials('aws', { name: 'aws-trial', secretNamepace: 'garden-trial' }),
  createProviderCredentials('azure', { quotas: [
    { metadata: { name: 'azure-foo-quota', namespace: 'garden-trial' } },
    { metadata: { name: 'azure-bar-quota', namespace: 'garden-test' },
      spec: {
        scope: {
          kind: 'Project',
          apiVersion: 'core.gardener.cloud/v1beta1',
        },
        clusterLifetimeDays: 7,
      } },
  ] }),
  createProviderCredentials('openstack'),
  createProviderCredentials('gcp'),
  createProviderCredentials('ironcore'),

  // DNS - no bindings
  createProviderCredentials('aws-route53', { createSecretBinding: false, createCredentialsBinding: false }),
  createProviderCredentials('azure-dns', { createSecretBinding: false, createCredentialsBinding: false }),
]

const secretBindings = credentials.map(item => item.secretBinding).filter(Boolean)
const credentialsBindings = credentials.map(item => item.credentialsBinding).filter(Boolean)
const secrets = credentials.map(item => item.secret).filter(Boolean)
const workloadIdentities = credentials.map(item => item.workloadIdentity).filter(Boolean)
const quotas = credentials.flatMap(item => item.quotas).filter(Boolean)

export default {
  secretBindings,
  credentialsBindings,
  workloadIdentities,
  secrets,
  quotas,
}
