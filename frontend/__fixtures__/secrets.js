//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function createCloudProviderSecret (cloudProviderKind, options = {}) {
  const {
    projectName = 'test',
    cloudProfileName = cloudProviderKind,
  } = options
  const name = `${cloudProfileName}-secret`
  const namespace = `garden-${projectName}`

  return {
    metadata: {
      namespace,
      name,
      secretRef: {
        name,
        namespace,
      },
      cloudProviderKind,
      cloudProfileName,
      projectName,
    },
  }
}

function createDnsProviderSecret (dnsProviderName, options = {}) {
  const {
    projectName = 'test',
  } = options
  const name = `${dnsProviderName}-secret`
  const namespace = `garden-${projectName}`

  return {
    metadata: {
      namespace,
      name,
      secretRef: {
        name,
        namespace,
      },
      dnsProviderName,
      projectName,
    },
  }
}

export default [
  createCloudProviderSecret('alicloud', { cloudProfileName: 'alicloud' }),
  createCloudProviderSecret('aws', { cloudProfileName: 'aws' }),
  createCloudProviderSecret('azure', { cloudProfileName: 'az' }),
  createCloudProviderSecret('openstack', { cloudProfileName: 'openstack-1' }),
  createCloudProviderSecret('openstack', { cloudProfileName: 'openstack-2' }),
  createCloudProviderSecret('gcp', { cloudProfileName: 'gcp' }),
  createCloudProviderSecret('ironcore', { cloudProfileName: 'ironcore' }),
  createDnsProviderSecret('aws-route53'),
  createDnsProviderSecret('azure-dns'),
]
