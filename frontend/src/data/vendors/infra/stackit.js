export const projectIdDetail = {
  label: 'Project ID',
  valueFrom: {
    key: ['project-id'],
  },
}

export const projectIdField = {
  key: 'project-id',
  label: 'Project ID',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const serviceAccountField = {
  key: 'serviceaccount.json',
  label: 'Service Account Key',
  hint: 'Enter or drop a service account key in JSON format',
  type: 'json',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    isJSON: {
      type: 'isValidObject',
      message: 'Not a valid JSON',
    },
    privateKey: {
      type: 'hasObjectProp',
      key: ['credentials', 'privateKey'],
      message: 'Must contain a valid private key',
    },
  },
}

export default {
  name: 'stackit',
  displayName: 'STACKIT',
  weight: 1100,
  icon: 'stackit.svg',
  secret: {
    details: [
      projectIdDetail,
    ],
    fields: [
      projectIdField,
      serviceAccountField,
    ],
    help: `
      <p>
        To authenticate against STACKIT, you need to provide your <strong>Project ID</strong> and a <strong>Service Account Key</strong> (serviceaccount.json).
      </p>
      <p>
        The service account key must be a valid JSON file containing your credentials and private key.
      </p>
      <p>
        For details on configuring your STACKIT provider and generating the required service account, see the
        <a href="https://github.com/stackitcloud/gardener-extension-provider-stackit/blob/main/docs/cloudprovider.md">STACKIT Cloud Provider Documentation</a>.
      </p>
    `,
  },
  shoot: {
    templates: {
      provider: {
        type: 'stackit',
        infrastructureConfig: {
          apiVersion: 'stackit.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: '__DEFAULT_WORKER_CIDR__',
          },
        },
        controlPlaneConfig: {
          apiVersion: 'stackit.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
  },
}
