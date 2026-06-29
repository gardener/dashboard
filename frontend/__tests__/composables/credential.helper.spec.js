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
  const providerConfigs = [
    ...infraProviders,
    ...dnsProviders,
  ]

  function providerConfig (name) {
    return providerConfigs.find(config => config.name === name)
  }

  function secretField (providerName, fieldKey) {
    return providerConfig(providerName).secret.fields.find(field => field.key === fieldKey)
  }

  it('matches snapshots for all known provider types (including unhandled types)', () => {
    const secret = {
      data: createSecretData(),
    }

    const detailsByProviderType = Object.fromEntries(
      providerConfigs.map(providerConfig => {
        return [providerConfig.name, secretDetails({ secret, providerConfig })]
      }),
    )

    expect(detailsByProviderType).toMatchSnapshot()
  })

  it('returns undefined for unknown provider types', () => {
    const secret = {
      data: createSecretData(),
    }

    expect(secretDetails({ secret, providerConfig: undefined })).toMatchSnapshot()
  })

  it('does not throw when secret is undefined', () => {
    const providerConfig = infraProviders.find(({ name }) => name === 'aws')

    expect(secretDetails({ secret: undefined, providerConfig })).toEqual([
      {
        label: 'Access Key ID',
        value: undefined,
      },
    ])
  })

  it('returns undefined for gcp-derived values when serviceaccount.json is invalid', () => {
    const secret = {
      data: {
        ...createSecretData(),
        project: undefined,
        'serviceaccount.json': encode('not-json'),
      },
    }

    const gcpProviderConfig = infraProviders.find(({ name }) => name === 'gcp')
    const googleCloudDnsProviderConfig = dnsProviders.find(({ name }) => name === 'google-clouddns')

    expect(secretDetails({ secret, providerConfig: gcpProviderConfig })).toEqual([
      {
        label: 'Project',
        value: undefined,
      },
    ])

    expect(secretDetails({ secret, providerConfig: googleCloudDnsProviderConfig })).toEqual([
      {
        label: 'Project',
        value: undefined,
      },
    ])
  })

  it('preserves migrated provider field validators and defaults', () => {
    expect(secretField('aws', 'accessKeyID').validators).toMatchObject({
      required: { type: 'required' },
      minLength: { type: 'minLength', length: 16 },
      maxLength: { type: 'maxLength', length: 128 },
      alphaNumUnderscore: { type: 'alphaNumUnderscore' },
    })
    expect(secretField('aws', 'secretAccessKey').validators).toMatchObject({
      required: { type: 'required' },
      minLength: { type: 'minLength', length: 40 },
      base64: { type: 'base64' },
    })

    expect(secretField('alicloud', 'accessKeyID').validators).toMatchObject({
      required: { type: 'required' },
      minLength: { type: 'minLength', length: 16 },
      maxLength: { type: 'maxLength', length: 128 },
    })
    expect(secretField('alicloud', 'accessKeySecret').validators).toMatchObject({
      required: { type: 'required' },
      minLength: { type: 'minLength', length: 30 },
    })

    expect(secretField('azure', 'clientID').validators.guid).toEqual({ type: 'guid' })
    expect(secretField('azure', 'tenantID').validators.guid).toEqual({ type: 'guid' })
    expect(secretField('azure', 'subscriptionID').validators.guid).toEqual({ type: 'guid' })

    expect(secretField('rfc2136', 'TSIGSecretAlgorithm')).toMatchObject({
      defaultValue: 'hmac-sha256',
    })
    expect(secretField('rfc2136', 'TSIGSecretAlgorithm').validators).toBeUndefined()
  })

  it('limits GCP project IDs to the documented length', () => {
    const projectIDValidator = secretField('gcp', 'serviceaccount.json').validators.projectID

    expect(projectIDValidator.pattern.test('abcde1')).toBe(true)
    expect(projectIDValidator.pattern.test(`a${'b'.repeat(29)}`)).toBe(true)
    expect(projectIDValidator.pattern.test(`a${'b'.repeat(30)}`)).toBe(false)
  })
})
