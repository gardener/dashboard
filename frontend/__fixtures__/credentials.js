//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function createProviderCredentials (type, options = {}) {
  const {
    projectName = 'test',
  } = options
  const secretBindingName = `${type}-secretbinding`
  const secretName = `${type}-secret`
  const namespace = `garden-${projectName}`
  return {
    secretBinding: {
      metadata: {
        namespace,
        name: secretBindingName,
      },
      provider: {
        type,
      },
      secretRef: {
        name: secretName,
        namespace,
      },
    },
    secret: {
      metadata: {
        namespace,
        name: secretName,
      },
    },
  }
}

const credentials = [
  createProviderCredentials('alicloud'),
  createProviderCredentials('aws'),
  createProviderCredentials('azure'),
  createProviderCredentials('openstack'),
  createProviderCredentials('gcp'),
  createProviderCredentials('ironcore'),
  createProviderCredentials('aws-route53'),
  createProviderCredentials('azure-dns'),
]

const secretBindings = credentials.map(item => item.secretBinding)
const secrets = credentials.map(item => item.secret)

export default {
  secretBindings,
  secrets,
}
