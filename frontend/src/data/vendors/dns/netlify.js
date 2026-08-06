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
        type: 'text',
        sensitive: true,
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
        For details, see the
        <a href="https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui">Netlify Documentation</a>.
      </p>
    `,
  },
}
