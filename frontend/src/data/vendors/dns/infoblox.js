//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'infoblox-dns',
  displayName: 'Infoblox',
  weight: 10200,
  icon: 'infoblox-dns.svg',
  secret: {
    details: [
      {
        label: 'Infoblox Username',
        key: 'USERNAME',
      },
    ],
    fields: [
      {
        key: 'USERNAME',
        label: 'Infoblox Username',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'PASSWORD',
        label: 'Infoblox Password',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>Before you can use Infoblox DNS provider, you need to add account credentials.</p>
      <p>Please enter account information for a technical user.</p>
      `,
  },
}
