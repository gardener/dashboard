//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { createWorkloadIdentityContextComposable } from '@/composables/credential/useWorkloadIdentityContext'
import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'

import aws from '@/data/vendors/infra/aws'
import azure from '@/data/vendors/infra/azure'
import gcp from '@/data/vendors/infra/gcp'
import local from '@/data/vendors/infra/local'

const authzStore = { namespace: 'garden-test' }

describe('useWorkloadIdentityContext', () => {
  it('preserves unknown empty objects, arrays and nulls without mutating the source', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    const source = {
      kind: 'WorkloadIdentity',
      apiVersion: 'security.gardener.cloud/v1alpha1',
      metadata: { name: 'identity', namespace: 'garden-test', annotations: {} },
      spec: { audiences: ['old'], extra: { object: {}, array: [], nil: null } },
      status: { sub: 'exact-subject' },
    }
    context.setWorkloadIdentityManifest(source)
    context.audiences.value = ['new']

    expect(context.workloadIdentityManifest.value).toEqual({ ...source, spec: { ...source.spec, audiences: ['new'] } })
    expect(source.spec.audiences).toEqual(['old'])
  })

  it('applies creation defaults before rendering and does not apply them on edit', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.createWorkloadIdentityManifest({ workloadIdentityConfig: gcp.workloadIdentity })
    expect(context.providerConfig.value.credentialsConfig).toMatchObject({
      universe_domain: 'googleapis.com', token_url: 'https://sts.googleapis.com/v1/token',
    })
    context.setWorkloadIdentityManifest({ spec: { targetSystem: { type: 'gcp', providerConfig: {} } } })
    context.setWorkloadIdentityFieldValues(gcp.workloadIdentity.fields, {})
    expect(context.providerConfig.value).toEqual({})
  })

  it('preserves immutable Azure identifiers while allowing the client ID to change', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.setWorkloadIdentityManifest({
      spec: { targetSystem: { type: 'azure', providerConfig: { tenantID: 'tenant', subscriptionID: 'subscription', clientID: 'old-client' } } },
    })
    context.setWorkloadIdentityFieldValues(azure.workloadIdentity.fields, { tenantID: 'changed', clientID: 'new-client' })

    expect(context.providerConfig.value).toEqual({ tenantID: 'tenant', subscriptionID: 'subscription', clientID: 'new-client' })
  })

  it('creates plain AWS data without Secret fields or base64 encoding', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.createWorkloadIdentityManifest({
      name: 'aws-identity',
      workloadIdentityConfig: aws.workloadIdentity,
    })
    context.setWorkloadIdentityFieldValues(aws.workloadIdentity.fields, {
      roleARN: 'arn:aws:iam::123456789012:role/gardener-workload-identity',
    })

    expect(context.workloadIdentityManifest.value).toEqual({
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentity',
      metadata: {
        name: 'aws-identity',
        namespace: 'garden-test',
      },
      spec: {
        audiences: [''],
        targetSystem: {
          type: 'aws',
          providerConfig: {
            apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
            kind: 'WorkloadIdentityConfig',
            roleARN: 'arn:aws:iam::123456789012:role/gardener-workload-identity',
          },
        },
      },
    })
    expect(context.workloadIdentityManifest.value).not.toHaveProperty('data')
    expect(context.workloadIdentityManifest.value).not.toHaveProperty('stringData')
    expect(context.workloadIdentityManifest.value).not.toHaveProperty('type')
  })

  it('builds the WorkloadIdentity CredentialsBinding reference GVK explicitly', () => {
    const binding = useCredentialsBindingContext({ authzStore })
    binding.createBindingManifest()
    binding.bindingName.value = 'identity'
    binding.bindingProviderType.value = 'aws'
    binding.bindingRef.value = {
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentity',
      name: 'identity',
      namespace: 'garden-test',
    }

    expect(binding.bindingManifest.value.credentialsRef).toEqual({
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentity',
      name: 'identity',
      namespace: 'garden-test',
    })
  })

  it('maps flat GCP fields into the nested external-account object', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.createWorkloadIdentityManifest({ workloadIdentityConfig: gcp.workloadIdentity })
    context.audiences.value = ['jwt-audience']
    context.setWorkloadIdentityFieldValues(gcp.workloadIdentity.fields, {
      projectID: 'my-project',
      credentialsAudience: '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/gardener',
      serviceAccountImpersonationURL: '',
    })

    expect(context.providerConfig.value).toEqual({
      apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentityConfig',
      projectID: 'my-project',
      credentialsConfig: {
        audience: '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/gardener',
        universe_domain: 'googleapis.com',
        token_url: 'https://sts.googleapis.com/v1/token',
        type: 'external_account',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      },
    })
    expect(context.validateProviderConfig(gcp.workloadIdentity)).toEqual([])
    expect(gcp.workloadIdentity.providerConfigDefaults).not.toHaveProperty('projectID')
  })

  it('omits providerConfig for local identities', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.createWorkloadIdentityManifest({ workloadIdentityConfig: local.workloadIdentity })

    expect(context.audiences.value).toEqual(['provider-local'])
    expect(context.workloadIdentityManifest.value.spec.targetSystem).toEqual({ type: 'local' })
  })

  it('preserves unknown manifest data and removes only the cleared optional path', () => {
    const source = {
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentity',
      metadata: {
        name: 'gcp-identity',
        namespace: 'garden-test',
        uid: 'uid-1',
        resourceVersion: '42',
        annotations: { custom: 'keep' },
      },
      spec: {
        audiences: ['audience'],
        custom: { keep: true },
        targetSystem: {
          type: 'gcp',
          providerConfig: {
            apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
            kind: 'WorkloadIdentityConfig',
            projectID: '',
            extra: { keep: true },
            credentialsConfig: {
              audience: 'provider-audience',
              universe_domain: 'example.sovereign-cloud.invalid',
              token_url: 'https://sts.example.sovereign-cloud.invalid/v1/token',
              type: 'external_account',
              subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
              service_account_impersonation_url: 'https://iamcredentials.googleapis.com/example',
            },
          },
        },
      },
      status: { sub: 'gardener.cloud:workloadidentity:garden-test:gcp-identity:uid-1' },
    }
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.setWorkloadIdentityManifest(source)
    const values = context.getWorkloadIdentityFieldValues(gcp.workloadIdentity.fields)
    context.setWorkloadIdentityFieldValues(gcp.workloadIdentity.fields, {
      ...values,
      serviceAccountImpersonationURL: '',
    })

    const result = context.workloadIdentityManifest.value
    expect(result.metadata.annotations.custom).toBe('keep')
    expect(result.metadata.uid).toBe('uid-1')
    expect(result.status.sub).toContain('uid-1')
    expect(result.spec.custom.keep).toBe(true)
    expect(result.spec.targetSystem.providerConfig.extra.keep).toBe(true)
    expect(result.spec.targetSystem.providerConfig.projectID).toBe('')
    expect(result.spec.targetSystem.providerConfig.credentialsConfig.universe_domain).toBe('example.sovereign-cloud.invalid')
    expect(result.spec.targetSystem.providerConfig.credentialsConfig.token_url).toBe('https://sts.example.sovereign-cloud.invalid/v1/token')
    expect(result.spec.targetSystem.providerConfig.credentialsConfig).not.toHaveProperty('service_account_impersonation_url')
    expect(source.spec.targetSystem.providerConfig.credentialsConfig).toHaveProperty('service_account_impersonation_url')
  })

  it('reports unsupported GCP external-account keys without dropping them', () => {
    const context = createWorkloadIdentityContextComposable({ authzStore })
    context.createWorkloadIdentityManifest({ workloadIdentityConfig: gcp.workloadIdentity })
    context.providerConfig.value.credentialsConfig.credential_source = { file: '/token' }

    expect(context.validateProviderConfig(gcp.workloadIdentity)).toContainEqual(expect.stringContaining('credential_source'))
    expect(context.providerConfig.value.credentialsConfig).toHaveProperty('credential_source')
  })
})
