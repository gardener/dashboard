//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'cloudflare-dns',
  displayName: 'Cloudflare DNS',
  weight: 10100,
  icon: 'cloudflare-dns.svg',
  secret: {
    details: [
      {
        label: 'API Key',
        hidden: true,
      },
    ],
    fields: [
      {
        key: 'apiToken',
        label: 'Cloudflare API Token',
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
        To use this provider you need to generate an API token from the Cloudflare dashboard. A detailed documentation to generate an API token is available at
        <a href="https://support.cloudflare.com/hc/en-us/articles/200167836-Managing-API-Tokens-and-Keys">Managing API Tokens and Keys</a>.
      </p>
      <p class="font-weight-bold">
        Note: You need to generate an API token and not an API key.
      </p>
      <p>
        To generate the token make sure the token has permission of Zone:Read and DNS:Edit for all zones. Optionally you can exclude certain zones.
      </p>
      <p class="font-weight-bold">
        Note: You need to Include All zones in the Zone Resources section. Setting Specific zone doesn't work. But you can still add one or more Excludes.
      </p>
      <p>
        Generate the token and keep this key safe as it won't be shown again.
      </p>
      <pre>$ echo -n '1234567890123456789' | base64</pre>
      <p>
        to get the base64 encoded token. In this eg. this would be MTIzNDU2Nzg5MDEyMzQ1Njc4OQ==.
      </p>
      `,
  },
}
