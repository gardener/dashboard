export default {
  name: 'openstack',
  displayName: 'OpenStack',
  weight: 400,
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
  },
}
