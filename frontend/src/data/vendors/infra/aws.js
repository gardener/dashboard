export const accessKeyIdDetail = {
  label: 'Access Key ID',
  valueFrom: {
    key: ['accessKeyID'],
  },
}

export const accessKeyIdField = {
  key: 'accessKeyID',
  label: 'Access Key ID',
  hint: 'e.g. AKIAIOSFODNN7EXAMPLE',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
    minLength: {
      type: 'minLength',
      length: 16,
    },
    maxLength: {
      type: 'maxLength',
      length: 128,
    },
    alphaNumUnderscore: {
      type: 'alphaNumUnderscore',
    },
  },
}

export const secretAccessKeyField = {
  key: 'secretAccessKey',
  label: 'Secret Access Key',
  hint: 'e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    minLength: {
      type: 'minLength',
      length: 40,
    },
    base64: {
      type: 'base64',
    },
  },
}

export default {
  name: 'aws',
  displayName: 'AWS',
  weight: 100,
  icon: 'aws.svg',
  shoot: {
    templates: {
      provider: {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: '__DEFAULT_WORKER_CIDR__',
            },
          },
        },
        controlPlaneConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
    zoneNetworking: {
      strategy: 'split-workers-public-internal',
    },
    workerVolume: {
      iops: {
        min: 100,
        hiddenForVolumeTypes: ['gp2'],
        requiredForVolumeTypes: ['io1', 'io2'],
      },
    },
    workerProviderConfig: {
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
    },
  },
  secret: {
    details: [
      accessKeyIdDetail,
    ],
    fields: [
      accessKeyIdField,
      secretAccessKeyField,
    ],
  },
}
