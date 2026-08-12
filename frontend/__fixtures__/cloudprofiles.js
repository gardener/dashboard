//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const kubernetesVersions = [
  {
    version: '1.29.2',
    classification: 'preview',
  },
  {
    version: '1.29.1',
    expirationDate: '2025-12-31T23:59:59Z',
    classification: 'preview',
  },
  {
    version: '1.28.7',
    expirationDate: '2024-12-31T23:59:59Z',
    classification: 'preview',
  },
  {
    version: '1.28.6',
    expirationDate: '2024-12-31T23:59:59Z',
    classification: 'supported',
  },
  {
    version: '1.28.4',
    expirationDate: '2024-12-31T23:59:59Z',
    classification: 'deprecated',
  },
  {
    version: '1.27.11',
    expirationDate: '2024-06-31T23:59:59Z',
    classification: 'preview',
  },
  {
    version: '1.27.10',
    expirationDate: '2024-06-31T23:59:59Z',
    classification: 'supported',
  },
  {
    version: '1.27.8',
    expirationDate: '2024-06-31T23:59:59Z',
    classification: 'deprecated',
  },
]

export const machineImages = [
  {
    name: 'gardenlinux',
    versions: [
      {
        version: '1443.0.0',
        classification: 'preview',
        cri: [
          {
            name: 'containerd',
            containerRuntimes: [
              {
                type: 'gvisor',
              },
            ],
          },
        ],
        architectures: [
          'amd64',
          'arm64',
        ],
      },
      {
        version: '1312.3.0',
        classification: 'supported',
        cri: [
          {
            name: 'containerd',
            containerRuntimes: [
              {
                type: 'gvisor',
              },
            ],
          },
        ],
        architectures: [
          'amd64',
          'arm64',
        ],
      },
      {
        version: '1312.2.0',
        expirationDate: '2024-09-01T23:59:59Z',
        classification: 'deprecated',
        cri: [
          {
            name: 'containerd',
            containerRuntimes: [
              {
                type: 'gvisor',
              },
            ],
          },
        ],
        architectures: [
          'amd64',
          'arm64',
        ],
      },
    ],
    updateStrategy: 'major',
  },
  {
    name: 'suse-chost',
    versions: [
      {
        version: '15.2.20220718',
        expirationDate: '2024-03-15T23:59:59Z',
        classification: 'deprecated',
        cri: [
          {
            name: 'containerd',
            containerRuntimes: [
              {
                type: 'gvisor',
              },
            ],
          },
        ],
        architectures: [
          'amd64',
        ],
      },
      {
        version: '15.4.20230410',
        expirationDate: '2024-03-15T23:59:59Z',
        classification: 'deprecated',
        cri: [
          {
            name: 'containerd',
            containerRuntimes: [
              {
                type: 'gvisor',
              },
            ],
          },
        ],
        architectures: [
          'amd64',
          'arm64',
        ],
      },
    ],
    updateStrategy: 'major',
  },
]

export default [
  {
    metadata: {
      name: 'alicloud',
      annotations: {
        'garden.sapcloud.io/displayName': 'Alibaba Cloud',
      },
    },
    spec: {
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '8',
          gpu: '0',
          memory: '8Gi',
          name: 'ecs.c1.small',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '16Gi',
          name: 'ecs.c2.medium',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '32Gi',
          name: 'ecs.c2.large',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '64Gi',
          name: 'ecs.c2.xlarge',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '2',
          gpu: '0',
          memory: '4Gi',
          name: 'ecs.c6.large',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '8Gi',
          name: 'ecs.c6.xlarge',
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'eu-central-1',
          zones: [
            {
              name: 'eu-central-1a',
            },
            {
              name: 'eu-central-1b',
            },
            {
              name: 'eu-central-1c',
              unavailableMachineTypes: [
                'ecs.c1.small',
                'ecs.c2.medium',
              ],
              unavailableVolumeTypes: [
                'cloud_ssd',
              ],
            },
          ],
        },
        {
          name: 'us-east-1',
          zones: [
            {
              name: 'us-east-1a',
            },
            {
              name: 'us-east-1b',
            },
          ],
        },
      ],
      type: 'alicloud',
      volumeTypes: [
        {
          class: 'standard',
          name: 'cloud',
          usable: true,
        },
        {
          class: 'standard',
          name: 'cloud_efficiency',
          usable: true,
        },
        {
          class: 'premium',
          name: 'cloud_ssd',
          usable: true,
        },
      ],
    },
  },
  {
    metadata: {
      name: 'aws',
      annotations: {
        'garden.sapcloud.io/displayName': 'aws',
      },
    },
    spec: {
      seedNames: [
        'aws-ha',
      ],
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '2',
          gpu: '0',
          memory: '8Gi',
          name: 'm4.large',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '16Gi',
          name: 'm4.xlarge',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '32Gi',
          name: 'm4.2xlarge',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '2',
          gpu: '0',
          memory: '4Gi',
          name: 'a1.large',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '8Gi',
          name: 'a1.xlarge',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '16Gi',
          name: 'a1.2xlarge',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '2',
          gpu: '1',
          memory: '8Gi',
          name: 'g5.large',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '1',
          memory: '16Gi',
          name: 'g5.xlarge',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '1',
          memory: '32Gi',
          name: 'g5.2xlarge',
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'eu-central-1',
          zones: [
            {
              name: 'eu-central-1a',
            },
            {
              name: 'eu-central-1b',
            },
            {
              name: 'eu-central-1c',
              unavailableMachineTypes: [
                'm4.large',
                'a1.large',
                'g5.large',
              ],
              unavailableVolumeTypes: [
                'gp3',
                'io1',
              ],
            },
          ],
          accessRestrictions: [{
            name: 'eu-access-only',
          }],
        },
        {
          name: 'eu-west-1',
          zones: [
            {
              name: 'eu-west-1a',
            },
            {
              name: 'eu-west-1b',
            },
            {
              name: 'eu-west-1c',
              unavailableMachineTypes: [
                'm4.xlarge',
                'a1.xlarge',
                'g5.xlarge',
              ],
              unavailableVolumeTypes: [
                'io1',
              ],
            },
          ],
          accessRestrictions: [{
            name: 'eu-access-only',
          }],
        },
        {
          name: 'us-east-1',
          zones: [
            {
              name: 'us-east-1a',
            },
            {
              name: 'us-east-1b',
            },
            {
              name: 'us-east-1c',
            },
            {
              name: 'us-east-1d',
            },
          ],
        },
      ],
      type: 'aws',
      volumeTypes: [
        {
          class: 'standard',
          name: 'gp3',
          usable: true,
        },
        {
          class: 'standard',
          name: 'gp2',
          usable: true,
        },
        {
          class: 'standard',
          name: 'io1',
          usable: true,
          minSize: '4Gi',
        },
      ],
    },
  },
  {
    metadata: {
      name: 'az',
      annotations: {
        'garden.sapcloud.io/displayName': 'Azure',
      },
    },
    spec: {
      seedNames: [
        'az-ha',
      ],
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '4',
          gpu: '0',
          memory: '8Gi',
          name: 'Standard_A4_v2',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '7Gi',
          name: 'Basic_A3',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '14Gi',
          name: 'Basic_A4',
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'westeurope',
          zones: [
            {
              name: '1',
            },
            {
              name: '2',
            },
            {
              name: '3',
              unavailableMachineTypes: [
                'Standard_A4_v2',
              ],
              unavailableVolumeTypes: [
                'StandardSSD_LRS',
              ],
            },
          ],
          accessRestrictions: [{
            name: 'eu-access-only',
          }],
        },
        {
          name: 'eastus',
          zones: [
            {
              name: '1',
            },
            {
              name: '2',
            },
            {
              name: '3',
            },
          ],
        },
      ],
      type: 'azure',
      volumeTypes: [
        {
          class: 'premium',
          name: 'StandardSSD_LRS',
          usable: true,
          minSize: '20Gi',
        },
        {
          class: 'standard',
          name: 'Standard_LRS',
          usable: true,
          minSize: '20Gi',
        },
        {
          class: 'premium',
          name: 'Premium_LRS',
          usable: true,
          minSize: '20Gi',
        },
      ],
    },
  },
  {
    metadata: {
      name: 'openstack-1',
      annotations: {
        'garden.sapcloud.io/displayName': 'Openstack 1',
      },
    },
    spec: {
      seedNames: [
        'openstack-ha',
      ],
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '2',
          gpu: '0',
          memory: '16Gi',
          name: 'g_c2_m16',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '32Gi',
          name: 'g_c4_m32',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '64Gi',
          name: 'g_c8_m64',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '128Gi',
          name: 'g_c16_m128',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '32',
          gpu: '0',
          memory: '256Gi',
          name: 'g_c32_m256',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '32',
          gpu: '3',
          memory: '384Gi',
          name: 'xg1bcm1.medium',
          storage: {
            class: 'standard',
            size: '1966Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
        constraints: {
          floatingPools: [
            {
              name: 'FloatingIP*',
              region: 'eu-de-1',
            },
            {
              name: 'FloatingIP*',
              region: 'na-us-1',
            },
          ],
          loadBalancerProviders: [
            {
              name: 'f5',
            },
          ],
        },
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'eu-de-1',
          zones: [
            {
              name: 'eu-de-1a',
            },
            {
              name: 'eu-de-1b',
            },
            {
              name: 'eu-de-1d',
              unavailableMachineTypes: [
                'g_c2_m16',
              ],
            },
          ],
          accessRestrictions: [{
            name: 'eu-access-only',
          }],
        },
        {
          name: 'na-us-1',
          zones: [
            {
              name: 'na-us-1a',
            },
            {
              name: 'na-us-1b',
            },
            {
              name: 'na-us-1d',
            },
          ],
        },
      ],
      type: 'openstack',
    },
  },
  {
    metadata: {
      name: 'openstack-2',
      annotations: {
        'garden.sapcloud.io/displayName': 'Openstack 2',
      },
    },
    spec: {
      seedNames: [
        'openstack-ha',
      ],
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '2',
          gpu: '0',
          memory: '16Gi',
          name: 'm_c2_m16',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '32Gi',
          name: 'm_c4_m32',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '64Gi',
          name: 'm_c8_m64',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '128Gi',
          name: 'm_c16_m128',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '32',
          gpu: '0',
          memory: '256Gi',
          name: 'm_c32_m256',
          storage: {
            class: 'standard',
            size: '64Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '32',
          gpu: '3',
          memory: '384Gi',
          name: 'zg1bcm1.medium',
          storage: {
            class: 'standard',
            size: '1966Gi',
            type: 'default',
          },
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
        constraints: {
          floatingPools: [
            {
              defaultFloatingSubnet: 'FloatingIP-intranet-*',
              loadBalancerClasses: [
                {
                  floatingSubnetName: 'FloatingIP-internet-*',
                  name: 'internet',
                },
                {
                  floatingSubnetName: 'FloatingIP-intranet-*',
                  name: 'intranet',
                  purpose: 'default',
                },
              ],
              name: 'FloatingIP*',
              region: 'eu-de-2',
            },
            {
              defaultFloatingSubnet: 'FloatingIP-intranet-*',
              loadBalancerClasses: [
                {
                  floatingSubnetName: 'FloatingIP-internet-*',
                  name: 'internet',
                },
                {
                  floatingSubnetName: 'FloatingIP-intranet-*',
                  name: 'intranet',
                  purpose: 'default',
                },
              ],
              name: 'FloatingIP*',
              region: 'na-us-2',
            },
          ],
          loadBalancerProviders: [
            {
              name: 'f5',
            },
          ],
        },
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'eu-de-2',
          zones: [
            {
              name: 'eu-de-2a',
            },
            {
              name: 'eu-de-2b',
            },
            {
              name: 'eu-de-2d',
              unavailableMachineTypes: [
                'm_c2_m16',
              ],
            },
          ],
          accessRestrictions: [{
            name: 'eu-access-only',
          }],
        },
        {
          name: 'na-us-2',
          zones: [
            {
              name: 'na-us-2a',
            },
            {
              name: 'na-us-2b',
            },
            {
              name: 'na-us-2d',
            },
          ],
        },
      ],
      type: 'openstack',
    },
  },
  {
    metadata: {
      name: 'gcp',
      annotations: {
        'garden.sapcloud.io/displayName': 'Google Cloud',
      },
    },
    spec: {
      seedNames: [
        'gcp-ha',
      ],
      kubernetes: {
        versions: [
          ...kubernetesVersions,
        ],
      },
      machineImages: [
        ...machineImages,
      ],
      machineTypes: [
        {
          cpu: '2',
          gpu: '0',
          memory: '7Gi',
          name: 'n1-standard-2',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '15Gi',
          name: 'n1-standard-4',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '30Gi',
          name: 'n1-standard-8',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '60Gi',
          name: 'n1-standard-16',
          usable: true,
          architecture: 'amd64',
        },
        {
          cpu: '2',
          gpu: '0',
          memory: '8Gi',
          name: 't2a-standard-2',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '4',
          gpu: '0',
          memory: '16Gi',
          name: 't2a-standard-4',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '8',
          gpu: '0',
          memory: '32Gi',
          name: 't2a-standard-8',
          usable: true,
          architecture: 'arm64',
        },
        {
          cpu: '16',
          gpu: '0',
          memory: '64Gi',
          name: 't2a-standard-16',
          usable: true,
          architecture: 'arm64',
        },
      ],
      providerConfig: {
        apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'europe-west1',
          zones: [
            {
              name: 'europe-west1-b',
            },
            {
              name: 'europe-west1-c',
            },
            {
              name: 'europe-west1-d',
              unavailableMachineTypes: [
                'n1-standard-2',
                'n1-standard-4',
                't2a-standard-2',
                't2a-standard-8',
              ],
              unavailableVolumeTypes: [
                'pd-balanced',
                'pd-ssd',
              ],
            },
          ],
        },
        {
          name: 'us-east1',
          zones: [
            {
              name: 'us-east1-b',
            },
            {
              name: 'us-east1-c',
            },
            {
              name: 'us-east1-d',
            },
          ],
        },
      ],
      type: 'gcp',
      volumeTypes: [
        {
          class: 'premium',
          name: 'pd-balanced',
          usable: true,
          minSize: '20Gi',
        },
        {
          class: 'standard',
          name: 'pd-standard',
          usable: true,
          minSize: '20Gi',
        },
        {
          class: 'premium',
          name: 'pd-ssd',
          usable: true,
          minSize: '20Gi',
        },
      ],
    },
  },
  {
    metadata: {
      name: 'ironcore',
      annotations: {
        'garden.sapcloud.io/displayName': 'IronCore',
      },
    },
    spec: {
      seedNames: [
        'gcp-ha',
      ],
      kubernetes: {
        versions: [
          {
            version: '1.28.4',
          },
          {
            version: '1.27.8',
          },
          {
            version: '1.26.11',
          },
        ],
      },
      machineImages: [
        {
          name: 'gardenlinux',
          versions: [
            {
              version: '1312.2.0',
              cri: [
                {
                  name: 'containerd',
                },
                {
                  name: 'docker',
                },
              ],
              architectures: [
                'amd64',
              ],
            },
          ],
          updateStrategy: 'major',
        },
      ],
      machineTypes: [
        {
          cpu: '4',
          gpu: '0',
          memory: '8Gi',
          name: 'x3-xlarge',
          usable: true,
          architecture: 'amd64',
        },
      ],
      providerConfig: {
        apiVersion: 'ironcore.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'CloudProfileConfig',
      },
      regions: [
        {
          name: 'de-fra',
          zones: [
            {
              name: 'fra3',
            },
          ],
        },
      ],
      type: 'ironcore',
      volumeTypes: [
        {
          class: 'standard',
          name: 'general-purpose',
          usable: true,
        },
        {
          class: 'premium',
          name: 'io-optimized',
          usable: true,
        },
      ],
    },
  },
]
