//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'netlify-dns',
  displayName: 'Netlify DNS',
  weight: 10300,
  icon: 'netlify-dns.svg',
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
        label: 'Netlify API Token',
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
        You need to provide an access token for Netlify to allow the dns-controller-manager to authenticate with the Netlify DNS API.
      </p>
      <p>
        Then, base64 encode the token. For example, if the generated token in 1234567890123456, use
      </p>
      <pre>$ echo -n '1234567890123456789' | base64</pre>
      <p>
        For details, see
        <a href="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui" target="_blank" rel="noopener noreferrer">Netlify Documentation</a>.
      </p>
      `,
  },
}
