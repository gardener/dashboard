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
  } = options
  const secretBindingName = `${name}-secretbinding`
  const secretBindingNamespace = `garden-${projectName}`
  const secretName = `${name}-secret`
  const quotaName = `${name}-quota`
  const secretBinding = {
    metadata: {
      namespace: secretBindingNamespace,
      name: secretBindingName,
    },
    provider: {
      type,
    },
    secretRef: {
      name: secretName,
      namespace: secretNamepace,
    },
  }

  let secret
  if (secretNamepace === secretBindingNamespace) {
    // no secret if referenced in other namespace
    secret = {
      metadata: {
        namespace: secretNamepace,
        name: secretName,
      },
      data: {
        secret: 'c3VwZXJzZWNyZXQ=',
      },
    }
  }

  if (secretNamepace !== secretBindingNamespace) {
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

  if (quotas.length > 0) {
    secretBinding.quotas = quotas.map(({ metadata }) => metadata)
  }

  return {
    secretBinding,
    secret,
    quotas,
  }
}

const credentials = [
  createProviderCredentials('alicloud'),
  createProviderCredentials('aws'),
  createProviderCredentials('aws', { name: 'aws-trial', secretNamepace: 'garden-trial' }),
  createProviderCredentials('azure', { quotas: [
    { metadata: { name: 'azure-foo-quota', namespace: 'garden-trial' } },
    { metadata: { name: 'azure-bar-quota', namespace: 'garden-test' } },
  ] }),
  createProviderCredentials('openstack'),
  createProviderCredentials('gcp'),
  createProviderCredentials('ironcore'),
  createProviderCredentials('aws-route53'),
  createProviderCredentials('azure-dns'),
]

const secretBindings = credentials.map(item => item.secretBinding)
const secrets = credentials.map(item => item.secret).filter(Boolean)
const quotas = credentials.flatMap(item => item.quotas).filter(Boolean)

export default {
  secretBindings,
  secrets,
  quotas,
}
