export default {
  name: 'openstack-designate',
  displayName: 'OpenStack Designate',
  weight: 500,
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
