//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Base64 } from 'js-base64'

import { secretDetails } from '@/composables/credential/helper'

import infraProviders from '@/data/vendors/infra'
import dnsProviders from '@/data/vendors/dns'

function encode (value) {
  return Base64.encode(value)
}

function createSecretData () {
  return {
    domainName: encode('example-domain'),
    tenantName: encode('example-tenant'),
    vsphereUsername: encode('example-vsphere-user'),
    nsxtUsername: encode('example-nsxt-user'),
    accessKeyID: encode('example-access-key-id'),
    subscriptionID: encode('example-subscription-id'),
    'serviceaccount.json': encode(JSON.stringify({ project_id: 'example-gcp-project-id' })),
    project: encode('example-google-project-id'),
    metalAPIURL: encode('https://metal.example.org'),
    USERNAME: encode('example-infoblox-user'),
    Server: encode('dns.example.org:53'),
    TSIGKeyName: encode('key.example.org.'),
    Zone: encode('example.org.'),
    server: encode('https://powerdns.example.org'),
  }
}

describe('secretDetails', () => {
  const providerTypes = [
    ...infraProviders.map(({ name }) => name),
    ...dnsProviders.map(({ name }) => name),
  ]

  it('matches snapshots for all known provider types (including unhandled types)', () => {
    const secret = {
      data: createSecretData(),
    }

    const detailsByProviderType = Object.fromEntries(
      providerTypes.map(providerType => {
        return [providerType, secretDetails({ secret, providerType })]
      }),
    )

    expect(detailsByProviderType).toMatchSnapshot()
  })

  it('returns undefined for unknown provider types', () => {
    const secret = {
      data: createSecretData(),
    }

    expect(secretDetails({ secret, providerType: 'unknown-provider' })).toMatchSnapshot()
  })
})
