//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'gcp',
  displayName: 'Google Cloud',
  weight: 300,
  icon: 'gcp.svg',
  shoot: {
    templates: {
      provider: {
        type: 'gcp',
        infrastructureConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: '__DEFAULT_WORKER_CIDR__',
          },
        },
        controlPlaneConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
    controlPlane: {
      zoneStrategy: 'worker-zones',
    },
  },
  secret: {
    fields: [
      {
        key: 'serviceaccount.json',
        label: 'Service Account Key',
        hint: 'Enter or drop a service account key in JSON format',
        type: 'json-secret',
        validators: {
          required: {
            type: 'required',
          },
          isJSON: {
            type: 'isValidObject',
          },
          projectID: {
            type: 'hasObjectProp',
            key: 'project_id',
            pattern: /^[a-z][a-z0-9-]{4,28}[a-z0-9]+$/,
          },
          type: {
            type: 'hasObjectProp',
            key: 'type',
            value: 'service_account',
          },
        },
      },
    ],
    help: `
      <p>
        A service account is a special account that can be used by services and applications running on your Google
        Compute Engine instance to interact with other Google Cloud Platform APIs. Applications can use service
        account credentials to authorize themselves to a set of APIs and perform actions within the permissions
        granted to the service account and virtual machine instance.
      </p>

      <p>
        Ensure that the service account has at least the roles below.
      </p>

      <ul>
        <li>Service Account Admin</li>
        <li>Service Account Token Creator</li>
        <li>Service Account User</li>
        <li>Compute Admin</li>
      </ul>

      <p>
        The Service Account has to be enabled for the Google Identity and Access Management API.
      </p>

      <p>
        Read the
        <a url="https://cloud.google.com/compute/docs/access/service-accounts">Service Account Documentation</a>
        on how to apply for credentials to service accounts.
      </p>
      `,
  },
}
