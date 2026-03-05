//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'vsphere',
  displayName: 'vSphere',
  weight: 700,
  icon: 'vsphere.svg',
  shoot: {
    templates: {
      provider: {
        type: 'vsphere',
        controlPlaneConfig: {
          apiVersion: 'vsphere.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
  },
  secret: {
    fields: [
      {
        key: 'vSphereUsername',
        label: 'vSphere Username',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'vSpherePassword',
        label: 'vSphere Password',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'NSXTUsername',
        label: 'NSX-T Username',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'NSXTPassword',
        label: 'NSX-T Password',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on VMware vSphere, you need to add vSphere and NSX-T account credentials.
        The Gardener needs these credentials to provision and operate the VMware vSphere infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Ensure that these accounts have privileges to <strong>create, modify and delete VMs and Networking resources</strong>.
      </p>
      <p>
        Please read the
        <a href="https://docs.vmware.com/de/VMware-vSphere/index.html">
          VMware vSphere Documentation
        </a>
        and the
        <a href="https://docs.vmware.com/en/VMware-NSX-T-Data-Center/index.html">
          VMware NSX-T Data Center Documentation
        </a>.
      </p>
      `,
  },
}
