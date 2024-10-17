//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function createCloudProviderSecret (type, options = {}) {
  const {
    projectName = 'test',
  } = options
  const name = `${type}-secret`
  const namespace = `garden-${projectName}`

  return {
    metadata: {
      namespace,
      name,
      secretRef: {
        name,
        namespace,
      },
      provider: {
        type,
      },
      projectName,
    },
  }
}

function createDnsProviderSecret (type, options = {}) {
  const {
    projectName = 'test',
  } = options
  const name = `${type}-secret`
  const namespace = `garden-${projectName}`

  return {
    metadata: {
      namespace,
      name,
      secretRef: {
        name,
        namespace,
      },
      provider: {
        type,
      },
      projectName,
    },
  }
}

export default [
  createCloudProviderSecret('alicloud'),
  createCloudProviderSecret('aws'),
  createCloudProviderSecret('azure'),
  createCloudProviderSecret('openstack'),
  createCloudProviderSecret('gcp'),
  createCloudProviderSecret('ironcore'),
  createDnsProviderSecret('aws-route53'),
  createDnsProviderSecret('azure-dns'),
]
