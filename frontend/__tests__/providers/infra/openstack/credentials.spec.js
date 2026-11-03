//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { getOpenStackCredentialDomainName } from '@/providers/infra/openstack/credentials'

describe('OpenStack credentials', () => {
  const credential = {
    data: {
      domainName: 'ZXhhbXBsZS1kb21haW4=',
    },
  }

  it('decodes the domain name from an OpenStack credential', () => {
    expect(getOpenStackCredentialDomainName(credential)).toBe('example-domain')
  })

  it('returns undefined if the credential has no domain name', () => {
    expect(getOpenStackCredentialDomainName({ data: {} })).toBeUndefined()
  })
})
