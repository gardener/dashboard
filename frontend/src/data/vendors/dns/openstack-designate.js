//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

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
