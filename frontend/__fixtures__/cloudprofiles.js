//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const DEFAULT_ARCHITECTURE = 'amd64'

const createMachineType = ({
  name,
  cpu,
  memory,
  gpu = '0',
  architecture = DEFAULT_ARCHITECTURE,
  usable = true,
  storage,
}) => ({
  name,
  cpu,
  gpu,
  memory,
  usable,
  architecture,
  ...(storage ? { storage } : {}),
})

const createVolumeType = ({
  name,
  class: volumeClass,
  usable = true,
  minSize,
}) => ({
  name,
  class: volumeClass,
  usable,
  ...(minSize ? { minSize } : {}),
})

const createZone = ({
  name,
  unavailableMachineTypes,
  unavailableVolumeTypes,
}) => ({
  name,
  ...(unavailableMachineTypes ? { unavailableMachineTypes } : {}),
  ...(unavailableVolumeTypes ? { unavailableVolumeTypes } : {}),
})

const createRegion = ({
  name,
  zones,
  accessRestrictions,
}) => ({
  name,
  zones,
  ...(accessRestrictions?.length
    ? {
        accessRestrictions: accessRestrictions.map(name => ({ name })),
      }
    : {}),
})

const createCloudProfile = ({
  metadataName,
  displayName,
  type,
  seedNames,
  providerConfig,
  machineTypes,
  regions,
  volumeTypes,
  kubernetes = { versions: [...kubernetesVersions] },
  machineImagesProfile = [...machineImages],
}) => ({
  metadata: {
    name: metadataName,
    annotations: {
      'garden.sapcloud.io/displayName': displayName,
    },
  },
  spec: {
    ...(seedNames ? { seedNames } : {}),
    kubernetes,
    machineImages: machineImagesProfile,
    machineTypes,
    providerConfig,
    regions,
    type,
    ...(volumeTypes ? { volumeTypes } : {}),
  },
})

const createOpenstackMachineTypes = ({ prefix, gpuType }) => {
  const storage = {
    class: 'standard',
    size: '64Gi',
    type: 'default',
  }
  return [
    createMachineType({ name: `${prefix}_c2_m16`, cpu: '2', memory: '16Gi', storage }),
    createMachineType({ name: `${prefix}_c4_m32`, cpu: '4', memory: '32Gi', storage }),
    createMachineType({ name: `${prefix}_c8_m64`, cpu: '8', memory: '64Gi', storage }),
    createMachineType({ name: `${prefix}_c16_m128`, cpu: '16', memory: '128Gi', storage }),
    createMachineType({ name: `${prefix}_c32_m256`, cpu: '32', memory: '256Gi', storage }),
    createMachineType({
      name: gpuType,
      cpu: '32',
      gpu: '3',
      memory: '384Gi',
      storage: {
        class: 'standard',
        size: '1966Gi',
        type: 'default',
      },
    }),
  ]
}

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

const alicloudMachineTypes = [
  createMachineType({ name: 'ecs.c1.small', cpu: '8', memory: '8Gi' }),
  createMachineType({ name: 'ecs.c2.medium', cpu: '16', memory: '16Gi' }),
  createMachineType({ name: 'ecs.c2.large', cpu: '16', memory: '32Gi' }),
  createMachineType({ name: 'ecs.c2.xlarge', cpu: '16', memory: '64Gi' }),
  createMachineType({ name: 'ecs.c6.large', cpu: '2', memory: '4Gi' }),
  createMachineType({ name: 'ecs.c6.xlarge', cpu: '4', memory: '8Gi' }),
]

const awsMachineTypes = [
  createMachineType({ name: 'm4.large', cpu: '2', memory: '8Gi' }),
  createMachineType({ name: 'm4.xlarge', cpu: '4', memory: '16Gi' }),
  createMachineType({ name: 'm4.2xlarge', cpu: '8', memory: '32Gi' }),
  createMachineType({ name: 'a1.large', cpu: '2', memory: '4Gi', architecture: 'arm64' }),
  createMachineType({ name: 'a1.xlarge', cpu: '4', memory: '8Gi', architecture: 'arm64' }),
  createMachineType({ name: 'a1.2xlarge', cpu: '8', memory: '16Gi', architecture: 'arm64' }),
  createMachineType({ name: 'g5.large', cpu: '2', memory: '8Gi', gpu: '1' }),
  createMachineType({ name: 'g5.xlarge', cpu: '4', memory: '16Gi', gpu: '1' }),
  createMachineType({ name: 'g5.2xlarge', cpu: '8', memory: '32Gi', gpu: '1' }),
]

const azureMachineTypes = [
  createMachineType({ name: 'Standard_A4_v2', cpu: '4', memory: '8Gi' }),
  createMachineType({ name: 'Basic_A3', cpu: '4', memory: '7Gi' }),
  createMachineType({ name: 'Basic_A4', cpu: '8', memory: '14Gi' }),
]

const gcpMachineTypes = [
  createMachineType({ name: 'n1-standard-2', cpu: '2', memory: '7Gi' }),
  createMachineType({ name: 'n1-standard-4', cpu: '4', memory: '15Gi' }),
  createMachineType({ name: 'n1-standard-8', cpu: '8', memory: '30Gi' }),
  createMachineType({ name: 'n1-standard-16', cpu: '16', memory: '60Gi' }),
  createMachineType({ name: 't2a-standard-2', cpu: '2', memory: '8Gi', architecture: 'arm64' }),
  createMachineType({ name: 't2a-standard-4', cpu: '4', memory: '16Gi', architecture: 'arm64' }),
  createMachineType({ name: 't2a-standard-8', cpu: '8', memory: '32Gi', architecture: 'arm64' }),
  createMachineType({ name: 't2a-standard-16', cpu: '16', memory: '64Gi', architecture: 'arm64' }),
]

const metalMachineTypes = [
  createMachineType({ name: 'c1-metal-small', cpu: '2', memory: '4Gi' }),
  createMachineType({ name: 'c1-metal-medium', cpu: '4', memory: '8Gi' }),
]

const localMachineTypes = [
  createMachineType({ name: 'local-dev-small', cpu: '2', memory: '4Gi' }),
]

const hcloudMachineTypes = [
  createMachineType({ name: 'cpx11', cpu: '2', memory: '2Gi' }),
  createMachineType({ name: 'cpx21', cpu: '3', memory: '4Gi' }),
]

const stackitMachineTypes = [
  createMachineType({ name: 'stackit-machine-1', cpu: '2', memory: '8Gi' }),
  createMachineType({ name: 'stackit-machine-2', cpu: '4', memory: '16Gi' }),
]

const vsphereMachineTypes = [
  createMachineType({ name: 'vsphere-machine-1', cpu: '2', memory: '4Gi' }),
  createMachineType({ name: 'vsphere-machine-2', cpu: '4', memory: '8Gi' }),
]

const openstack1MachineTypes = createOpenstackMachineTypes({
  prefix: 'g',
  gpuType: 'xg1bcm1.medium',
})

const openstack2MachineTypes = createOpenstackMachineTypes({
  prefix: 'm',
  gpuType: 'zg1bcm1.medium',
})

export default [
  createCloudProfile({
    metadataName: 'alicloud',
    displayName: 'Alibaba Cloud',
    type: 'alicloud',
    machineTypes: alicloudMachineTypes,
    providerConfig: {
      apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'eu-central-1',
        zones: [
          createZone({ name: 'eu-central-1a' }),
          createZone({ name: 'eu-central-1b' }),
          createZone({
            name: 'eu-central-1c',
            unavailableMachineTypes: [
              alicloudMachineTypes[0].name,
              alicloudMachineTypes[1].name,
            ],
            unavailableVolumeTypes: [
              'cloud_ssd',
            ],
          }),
        ],
      }),
      createRegion({
        name: 'us-east-1',
        zones: [
          createZone({ name: 'us-east-1a' }),
          createZone({ name: 'us-east-1b' }),
        ],
      }),
    ],
    volumeTypes: [
      createVolumeType({ name: 'cloud', class: 'standard' }),
      createVolumeType({ name: 'cloud_efficiency', class: 'standard' }),
      createVolumeType({ name: 'cloud_ssd', class: 'premium' }),
    ],
  }),
  createCloudProfile({
    metadataName: 'aws',
    displayName: 'aws',
    type: 'aws',
    seedNames: [
      'aws-ha',
    ],
    machineTypes: awsMachineTypes,
    providerConfig: {
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'eu-central-1',
        zones: [
          createZone({ name: 'eu-central-1a' }),
          createZone({ name: 'eu-central-1b' }),
          createZone({
            name: 'eu-central-1c',
            unavailableMachineTypes: [
              awsMachineTypes[0].name,
              awsMachineTypes[3].name,
              awsMachineTypes[6].name,
            ],
            unavailableVolumeTypes: [
              'gp3',
              'io1',
            ],
          }),
        ],
        accessRestrictions: ['eu-access-only'],
      }),
      createRegion({
        name: 'eu-west-1',
        zones: [
          createZone({ name: 'eu-west-1a' }),
          createZone({ name: 'eu-west-1b' }),
          createZone({
            name: 'eu-west-1c',
            unavailableMachineTypes: [
              awsMachineTypes[1].name,
              awsMachineTypes[4].name,
              awsMachineTypes[7].name,
            ],
            unavailableVolumeTypes: [
              'io1',
            ],
          }),
        ],
        accessRestrictions: ['eu-access-only'],
      }),
      createRegion({
        name: 'us-east-1',
        zones: [
          createZone({ name: 'us-east-1a' }),
          createZone({ name: 'us-east-1b' }),
          createZone({ name: 'us-east-1c' }),
          createZone({ name: 'us-east-1d' }),
        ],
      }),
    ],
    volumeTypes: [
      createVolumeType({ name: 'gp3', class: 'standard' }),
      createVolumeType({ name: 'gp2', class: 'standard' }),
      createVolumeType({ name: 'io1', class: 'standard', minSize: '4Gi' }),
    ],
  }),
  createCloudProfile({
    metadataName: 'az',
    displayName: 'Azure',
    type: 'azure',
    seedNames: [
      'az-ha',
    ],
    machineTypes: azureMachineTypes,
    providerConfig: {
      apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'westeurope',
        zones: [
          createZone({ name: '1' }),
          createZone({ name: '2' }),
          createZone({
            name: '3',
            unavailableMachineTypes: [
              azureMachineTypes[0].name,
            ],
            unavailableVolumeTypes: [
              'StandardSSD_LRS',
            ],
          }),
        ],
        accessRestrictions: ['eu-access-only'],
      }),
      createRegion({
        name: 'eastus',
        zones: [
          createZone({ name: '1' }),
          createZone({ name: '2' }),
          createZone({ name: '3' }),
        ],
      }),
    ],
    volumeTypes: [
      createVolumeType({ name: 'StandardSSD_LRS', class: 'premium', minSize: '20Gi' }),
      createVolumeType({ name: 'Standard_LRS', class: 'standard', minSize: '20Gi' }),
      createVolumeType({ name: 'Premium_LRS', class: 'premium', minSize: '20Gi' }),
    ],
  }),
  createCloudProfile({
    metadataName: 'openstack-1',
    displayName: 'Openstack 1',
    type: 'openstack',
    seedNames: [
      'openstack-ha',
    ],
    machineTypes: openstack1MachineTypes,
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
      createRegion({
        name: 'eu-de-1',
        zones: [
          createZone({ name: 'eu-de-1a' }),
          createZone({ name: 'eu-de-1b' }),
          createZone({
            name: 'eu-de-1d',
            unavailableMachineTypes: [
              openstack1MachineTypes[0].name,
            ],
          }),
        ],
        accessRestrictions: ['eu-access-only'],
      }),
      createRegion({
        name: 'na-us-1',
        zones: [
          createZone({ name: 'na-us-1a' }),
          createZone({ name: 'na-us-1b' }),
          createZone({ name: 'na-us-1d' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'openstack-2',
    displayName: 'Openstack 2',
    type: 'openstack',
    seedNames: [
      'openstack-ha',
    ],
    machineTypes: openstack2MachineTypes,
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
      createRegion({
        name: 'eu-de-2',
        zones: [
          createZone({ name: 'eu-de-2a' }),
          createZone({ name: 'eu-de-2b' }),
          createZone({
            name: 'eu-de-2d',
            unavailableMachineTypes: [
              openstack2MachineTypes[0].name,
            ],
          }),
        ],
        accessRestrictions: ['eu-access-only'],
      }),
      createRegion({
        name: 'na-us-2',
        zones: [
          createZone({ name: 'na-us-2a' }),
          createZone({ name: 'na-us-2b' }),
          createZone({ name: 'na-us-2d' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'gcp',
    displayName: 'Google Cloud',
    type: 'gcp',
    seedNames: [
      'gcp-ha',
    ],
    machineTypes: gcpMachineTypes,
    providerConfig: {
      apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'europe-west1',
        zones: [
          createZone({ name: 'europe-west1-b' }),
          createZone({ name: 'europe-west1-c' }),
          createZone({
            name: 'europe-west1-d',
            unavailableMachineTypes: [
              gcpMachineTypes[0].name,
              gcpMachineTypes[1].name,
              gcpMachineTypes[4].name,
              gcpMachineTypes[6].name,
            ],
            unavailableVolumeTypes: [
              'pd-balanced',
              'pd-ssd',
            ],
          }),
        ],
      }),
      createRegion({
        name: 'us-east1',
        zones: [
          createZone({ name: 'us-east1-b' }),
          createZone({ name: 'us-east1-c' }),
          createZone({ name: 'us-east1-d' }),
        ],
      }),
    ],
    volumeTypes: [
      createVolumeType({ name: 'pd-balanced', class: 'premium', minSize: '20Gi' }),
      createVolumeType({ name: 'pd-standard', class: 'standard', minSize: '20Gi' }),
      createVolumeType({ name: 'pd-ssd', class: 'premium', minSize: '20Gi' }),
    ],
  }),
  createCloudProfile({
    metadataName: 'hcloud',
    displayName: 'Hetzner Cloud',
    type: 'hcloud',
    seedNames: [
      'hcloud-ha',
    ],
    machineTypes: hcloudMachineTypes,
    providerConfig: {
      apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'fsn1',
        zones: [
          createZone({ name: 'fsn1-dc14' }),
          createZone({ name: 'fsn1-dc8' }),
        ],
      }),
      createRegion({
        name: 'hel1',
        zones: [
          createZone({ name: 'hel1-dc2' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'metal',
    displayName: 'OnMetal',
    type: 'metal',
    seedNames: [
      'metal-ha',
    ],
    machineTypes: metalMachineTypes,
    providerConfig: {
      apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'eu01',
        zones: [
          createZone({ name: 'eu01-a' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'local',
    displayName: 'Local',
    type: 'local',
    machineTypes: localMachineTypes,
    providerConfig: {
      apiVersion: 'local.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'local',
        zones: [
          createZone({ name: 'local-a' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'stackit',
    displayName: 'stackit',
    type: 'stackit',
    seedNames: [
      'stackit-ha',
    ],
    machineTypes: stackitMachineTypes,
    providerConfig: {
      apiVersion: 'stackit.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'eu01',
        zones: [
          createZone({ name: 'eu01-1' }),
          createZone({ name: 'eu01-2' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'vsphere',
    displayName: 'vSphere',
    type: 'vsphere',
    seedNames: [
      'vsphere-ha',
    ],
    machineTypes: vsphereMachineTypes,
    providerConfig: {
      apiVersion: 'vsphere.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'region1',
        zones: [
          createZone({ name: 'zone1' }),
          createZone({ name: 'zone2' }),
        ],
      }),
    ],
  }),
  createCloudProfile({
    metadataName: 'ironcore',
    displayName: 'IronCore',
    type: 'ironcore',
    seedNames: [
      'ironcore-ha',
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
    machineImagesProfile: [
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
      createMachineType({ name: 'x3-xlarge', cpu: '4', memory: '8Gi' }),
    ],
    providerConfig: {
      apiVersion: 'ironcore.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'CloudProfileConfig',
    },
    regions: [
      createRegion({
        name: 'de-fra',
        zones: [
          createZone({ name: 'fra3' }),
        ],
      }),
    ],
    volumeTypes: [
      createVolumeType({ name: 'general-purpose', class: 'standard' }),
      createVolumeType({ name: 'io-optimized', class: 'premium' }),
    ],
  }),
]
