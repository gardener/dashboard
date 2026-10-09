//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useOpenStackCredentialDomainName } from '@/providers/infra/openstack/credentials'

describe('OpenStack credentials', () => {
  const createBindingContext = ({
    providerType = 'openstack',
    credential = {
      data: {
        domainName: 'ZXhhbXBsZS1kb21haW4=',
      },
    },
    hasOwnSecret = true,
  } = {}) => ({
    providerType: ref(providerType),
    credential: ref(credential),
    hasOwnSecret: ref(hasOwnSecret),
  })

  it('decodes the domain name for an owned OpenStack Secret', () => {
    const domainName = useOpenStackCredentialDomainName(createBindingContext())

    expect(domainName.value).toBe('example-domain')
  })

  it('does not resolve a domain name for another provider', () => {
    const domainName = useOpenStackCredentialDomainName(createBindingContext({ providerType: 'aws' }))

    expect(domainName.value).toBeUndefined()
  })

  it('does not resolve a domain name without an owned Secret', () => {
    const domainName = useOpenStackCredentialDomainName(createBindingContext({ hasOwnSecret: false }))

    expect(domainName.value).toBeUndefined()
  })
})
