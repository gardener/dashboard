import {
  serviceIdentityDetail,
  serviceIdentityField,
} from '../infra/gdch'

const gdchConfigField = {
  key: 'gdch-config',
  label: 'GDC Org Config',
  hint: 'Generated from the org cluster URL and CA bundle',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    base64: {
      type: 'base64',
    },
  },
}

export default {
  name: 'gdch-dns',
  displayName: 'Google Distributed Cloud DNS',
  weight: 700,
  icon: 'gdch.svg',
  secret: {
    details: [
      serviceIdentityDetail,
    ],
    fields: [
      serviceIdentityField,
      gdchConfigField,
    ],
    help: `
      <p>
        GDC-A DNS uses the same service identity key as a shoot credential, plus the organization
        cluster URL and CA bundle for the organization hosting your <code>ManagedDNSZone</code>.
        See the <a href="https://docs.cloud.google.com/distributed-cloud/hosted/docs/latest/gdcag/platform/pa-user/pki/fetch-trust-bundles#fetch-trust-bundle" target="_blank" rel="noopener noreferrer">official documentation</a>
        for instructions on how to fetch a trust bundle.
      </p>
      <p>
        The service identity needs the <strong>Managed DNS Project Admin</strong> role on the project
        that owns the <code>ManagedDNSZone</code>. You can reuse the existing shoot service identity by
        adding that role to it.
      </p>
    `,
  },
}
