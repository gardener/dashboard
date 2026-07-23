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
    metalAPIURL: encode('https://metal.example.org'),
    USERNAME: encode('example-infoblox-user'),
    Server: encode('dns.example.org:53'),
    TSIGKeyName: encode('key.example.org.'),
    Zone: encode('example.org.'),
    server: encode('https://powerdns.example.org'),
  }
}

function resolveDetailValue ({ data, valueFrom }) {
  const details = secretDetails({
    secret: { data },
    providerConfig: {
      secret: {
        details: [
          {
            label: 'Value',
            valueFrom,
          },
        ],
      },
    },
  })

  return details[0].value
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

  it('uses valueFrom for all visible details in the vendor configuration', () => {
    for (const providerConfig of providerConfigs) {
      for (const detail of providerConfig.secret?.details ?? []) {
        if (detail.hidden) {
          continue
        }

        expect(detail).toHaveProperty('valueFrom')
        expect(detail).not.toHaveProperty('key')
        expect(detail).not.toHaveProperty('decode')
      }
    }
  })

  it('resolves single and fallback key paths without mutating the source configuration', () => {
    const literalKeySource = Object.freeze({
      key: Object.freeze(['literal.key']),
    })
    const fallbackKeysSource = Object.freeze({
      keys: Object.freeze([
        Object.freeze(['empty']),
        Object.freeze(['nested', 'fallback']),
      ]),
    })

    expect(resolveDetailValue({
      data: {
        literal: {
          key: encode('wrong-value'),
        },
        'literal.key': encode('literal-value'),
      },
      valueFrom: literalKeySource,
    })).toBe('literal-value')

    expect(resolveDetailValue({
      data: {
        empty: '',
        nested: {
          fallback: encode('fallback-value'),
        },
      },
      valueFrom: fallbackKeysSource,
    })).toBe('fallback-value')
  })

  it('supports parsing raw values when decoding is disabled', () => {
    expect(resolveDetailValue({
      data: {
        raw: JSON.stringify({
          nested: {
            value: 'raw-value',
          },
        }),
      },
      valueFrom: {
        key: ['raw'],
        decode: false,
        parse: 'json',
        path: ['nested', 'value'],
      },
    })).toBe('raw-value')
  })

  it.each([
    ['both key and keys', { key: ['value'], keys: [['value']] }],
    ['a string key', { key: 'value' }],
    ['flat fallback keys', { keys: ['value'] }],
    ['an invalid result path', { key: ['value'], path: 'nested.value' }],
    ['an unsupported parser', { key: ['value'], parse: 'yaml' }],
    ['an array', [{ key: ['value'] }]],
  ])('rejects valueFrom with %s', (description, valueFrom) => {
    expect(resolveDetailValue({
      data: {
        value: encode('value'),
      },
      valueFrom,
    })).toBeUndefined()
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

  it('resolves the Google Cloud DNS project from serviceaccount.json', () => {
    const secret = {
      data: {
        'serviceaccount.json': encode(JSON.stringify({
          project_id: 'fallback-project-id',
        })),
      },
    }
    const providerConfig = dnsProviders.find(({ name }) => name === 'google-clouddns')

    expect(secretDetails({ secret, providerConfig })).toEqual([
      {
        label: 'Project',
        value: 'fallback-project-id',
      },
    ])
  })

  it('returns undefined for gcp-derived values when serviceaccount.json is invalid', () => {
    const secret = {
      data: {
        ...createSecretData(),
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
      defaultValue: '',
      omitWhenEmpty: true,
      values: expect.arrayContaining([
        expect.objectContaining({
          value: '',
        }),
      ]),
    })
    expect(secretField('rfc2136', 'TSIGSecretAlgorithm').validators).toBeUndefined()

    expect(secretField('aws-route53', 'AWS_REGION')).toMatchObject({
      omitWhenEmpty: true,
    })
    expect(secretField('azure-dns', 'AZURE_CLOUD')).toMatchObject({
      defaultValue: '',
      omitWhenEmpty: true,
      values: expect.arrayContaining([
        expect.objectContaining({
          value: '',
        }),
      ]),
    })
  })

  it('limits GCP project IDs to the documented length', () => {
    const projectIDValidator = secretField('gcp', 'serviceaccount.json').validators.projectID

    expect(projectIDValidator.pattern.test('abcde1')).toBe(true)
    expect(projectIDValidator.pattern.test(`a${'b'.repeat(29)}`)).toBe(true)
    expect(projectIDValidator.pattern.test(`a${'b'.repeat(30)}`)).toBe(false)
  })
})
