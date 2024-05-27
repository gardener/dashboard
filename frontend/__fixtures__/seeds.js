//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default [
  {
    metadata: {
      name: 'ali-ha',
      unreachable: false,
    },
    data: {
      volume: {
        minimumSize: '20Gi',
      },
      type: 'alicloud',
      region: 'eu-central-1',
      zones: [
        'eu-central-1a',
        'eu-central-1b',
        'eu-central-1c',
      ],
      visible: true,
      unprotected: true,
    },
  },
  {
    metadata: {
      name: 'aws-ha',
      unreachable: false,
    },
    data: {
      type: 'aws',
      region: 'eu-west-1',
      zones: [
        'eu-west-1a',
        'eu-west-1b',
        'eu-west-1c',
      ],
      visible: true,
      unprotected: true,
    },
  },
  {
    metadata: {
      name: 'az-ha',
      unreachable: false,
    },
    data: {
      type: 'azure',
      region: 'westeurope',
      zones: [
        'westeurope-1',
        'westeurope-2',
        'westeurope-3',
      ],
      visible: true,
      unprotected: true,
    },
  },
  {
    metadata: {
      name: 'openstack-ha',
      unreachable: true,
    },
    data: {
      type: 'openstack',
      region: 'eu-de-1',
      zones: [
        'eu-de-1a',
        'eu-de-1b',
        'eu-de-1d',
      ],
      visible: true,
      unprotected: true,
    },
  },
  {
    metadata: {
      name: 'gcp-ha',
      unreachable: false,
    },
    data: {
      type: 'gcp',
      region: 'europe-west1',
      zones: [
        'europe-west1-b',
        'europe-west1-c',
        'europe-west1-d',
      ],
      visible: true,
      unprotected: true,
    },
  },
]
