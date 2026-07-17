export default {
  name: 'openstack',
  displayName: 'OpenStack',
  weight: 400,
  icon: 'openstack.svg',
  secret: {
    details: [
      {
        label: 'Domain Name',
        key: 'domainName',
      },
      {
        label: 'Tenant Name',
        key: 'tenantName',
      },
    ],
  },
}
