//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'onMetal',
  displayName: 'OnMetal',
  weight: 900,
  icon: 'onmetal.svg',
  secret: {
    fields: [
      {
        key: 'metalAPIURL',
        label: 'API URL',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          url: {
            type: 'url',
          },
        },
      },
      {
        key: 'metalAPIHMac',
        label: 'API HMAC',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on Metal Stack, you need to provide HMAC credentials and the endpoint of your Metal API.
        The Gardener needs the credentials to provision and operate the Metal Stack infrastructure for your Kubernetes cluster.
      </p>
      `,
  },
}
