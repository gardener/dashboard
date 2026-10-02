import {
  applicationCredentialIdField,
  applicationCredentialNameField,
  applicationCredentialSecretField,
  authUrlField,
  domainNameField,
  passwordField,
  tenantNameField,
  usernameField,
} from '../infra/openstack'

export default {
  name: 'openstack-designate',
  displayName: 'OpenStack Designate',
  weight: 500,
  icon: 'openstack.svg',
  secret: {
    details: [
      {
        label: 'Domain Name',
        valueFrom: {
          key: ['domainName'],
        },
      },
      {
        label: 'Tenant Name',
        valueFrom: {
          key: ['tenantName'],
        },
      },
    ],
    fields: [
      { ...authUrlField, aliases: ['OS_AUTH_URL'] },
      { ...domainNameField, aliases: ['OS_DOMAIN_NAME'] },
      { ...tenantNameField, aliases: ['OS_PROJECT_NAME'] },
      { ...applicationCredentialIdField, aliases: ['OS_APPLICATION_CREDENTIAL_ID'] },
      { ...applicationCredentialNameField, aliases: ['OS_APPLICATION_CREDENTIAL_NAME'] },
      { ...applicationCredentialSecretField, aliases: ['OS_APPLICATION_CREDENTIAL_SECRET'] },
      { ...usernameField, aliases: ['OS_USERNAME'] },
      { ...passwordField, aliases: ['OS_PASSWORD'] },
    ],
  },
}
