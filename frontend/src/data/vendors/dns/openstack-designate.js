import openstack from '../infra/openstack'

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
    fields: openstack.secret.fields,
  },
}
