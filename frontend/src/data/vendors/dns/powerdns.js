//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'powerdns',
  displayName: 'PowerDNS',
  weight: 10400,
  icon: 'powerdns.svg',
  secret: {
    details: [
      {
        label: 'Server',
        key: 'server',
      },
      {
        label: 'API Key',
        hidden: true,
      },
    ],
    fields: [
      {
        key: 'server',
        label: 'Server',
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
        key: 'apiKey',
        label: 'API Key',
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
        To use this provider you need to configure the PowerDNS API with an API key. A detailed documentation to generate an API key is available at
        <a href="https://doc.powerdns.com/authoritative/http-api/index.html#enabling-the-api" target="_blank" rel="noopener noreferrer">PowerDNS Documentation</a>.
      </p>
      `,
  },
}
