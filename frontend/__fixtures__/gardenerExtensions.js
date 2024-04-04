//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default [
  {
    name: 'networking-calico',
    resources: [
      {
        kind: 'Network',
        type: 'calico',
        primary: true,
      },
    ],
  },
  {
    name: 'networking-cilium',
    resources: [
      {
        kind: 'Network',
        type: 'cilium',
        primary: true,
      },
    ],
  },
  {
    name: 'provider-alicloud',
    resources: [
      {
        kind: 'DNSRecord',
        type: 'alicloud-dns',
        primary: true,
      },
    ],
  },
  {
    name: 'provider-aws',
    resources: [
      {
        kind: 'DNSRecord',
        type: 'aws-route53',
        primary: true,
      },
    ],
  },
  {
    name: 'provider-azure',
    resources: [
      {
        kind: 'DNSRecord',
        type: 'azure-dns',
        primary: true,
      },
    ],
  },
  {
    name: 'provider-gcp',
    resources: [
      {
        kind: 'DNSRecord',
        type: 'google-clouddns',
        primary: true,
      },
    ],
  },
  {
    name: 'provider-openstack',
    resources: [
      {
        kind: 'DNSRecord',
        type: 'openstack-designate',
        primary: true,
      },
    ],
  },
]
