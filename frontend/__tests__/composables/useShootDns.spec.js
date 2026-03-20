//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import {
  reactive,
  toRef,
} from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'

import { useShootDns } from '@/composables/useShootDns'

import cloneDeep from 'lodash/cloneDeep'

describe('composables', () => {
  describe('useShootDns', () => {
    const manifest = reactive({})
    let shootDns

    beforeEach(() => {
      setActivePinia(createPinia())
      manifest.spec = {}
      const credentialStore = useCredentialStore()
      credentialStore._setCredentials(global.fixtures.credentials)
      const gardenerExtensionStore = useGardenerExtensionStore()
      gardenerExtensionStore.list = global.fixtures.gardenerExtensions

      const composable = useShootDns(toRef(manifest), {
        gardenerExtensionStore,
        credentialStore,
      })
      shootDns = reactive(composable)
    })

    it('should add extension dns providers', () => {
      shootDns.addDnsServiceExtensionProvider()
      shootDns.dnsDomain = 'example.org'

      expect(shootDns.dnsServiceExtensionProviders).toHaveLength(1)

      expect(manifest.spec).toMatchSnapshot()
    })

    it('should delete extension dns providers', () => {
      shootDns.addDnsServiceExtensionProvider()
      shootDns.addDnsServiceExtensionProvider()

      expect(shootDns.dnsServiceExtensionProviders).toHaveLength(2)
      expect(manifest.spec).toMatchSnapshot('two providers added')

      shootDns.deleteDnsServiceExtensionProvider(0)
      expect(manifest.spec).toMatchSnapshot('one provider deleted')

      // Delete last extension dns provider
      shootDns.deleteDnsServiceExtensionProvider(0)
      expect(manifest.spec).toMatchSnapshot('last provider deleted')
    })

    it('should add primary dns provider', () => {
      shootDns.dnsDomain = 'example.org'
      shootDns.dnsPrimaryProviderType = 'foo'
      shootDns.dnsPrimaryProviderCredentialsRef = {
        apiVersion: 'v1',
        kind: 'Secret',
        name: 'bar',
      }

      expect(manifest.spec).toMatchSnapshot()
    })

    it('should add extension custom domain dns provider', () => {
      shootDns.dnsDomain = 'example.org'
      shootDns.dnsPrimaryProviderType = 'foo'
      shootDns.dnsPrimaryProviderCredentialsRef = {
        apiVersion: 'v1',
        kind: 'Secret',
        name: 'bar',
      }

      expect(shootDns.hasDnsServiceExtensionProviderForCustomDomain).toBe(false)

      shootDns.addDnsServiceExtensionProviderForCustomDomain()
      expect(shootDns.hasDnsServiceExtensionProviderForCustomDomain).toBe(true)

      expect(manifest.spec).toMatchSnapshot()
    })

    it('should read old primary dns provider secretName as fallback', () => {
      manifest.spec.dns = {
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
        }],
      }

      expect(shootDns.dnsPrimaryProviderCredentialsRef).toEqual({
        apiVersion: 'v1',
        kind: 'Secret',
        name: 'legacy-secret',
      })
    })

    it('should migrate old primary dns provider secretName to credentialsRef when dns config changes', () => {
      manifest.spec.dns = {
        domain: 'example.org',
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
        }],
      }

      shootDns.dnsPrimaryProviderType = 'bar'

      expect(manifest.spec.dns.providers).toEqual([{
        primary: true,
        type: 'bar',
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          name: 'legacy-secret',
        },
      }])
    })

    it('should migrate old primary dns provider secretName to credentialsRef when only the domain changes', () => {
      manifest.spec.dns = {
        domain: 'example.org',
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
        }],
      }

      shootDns.dnsDomain = 'example.com'

      expect(manifest.spec.dns).toEqual({
        domain: 'example.com',
        providers: [{
          primary: true,
          type: 'foo',
          credentialsRef: {
            apiVersion: 'v1',
            kind: 'Secret',
            name: 'legacy-secret',
          },
        }],
      })
    })

    it('should drop legacy primary dns provider secretName when credentialsRef is already set', () => {
      manifest.spec.dns = {
        domain: 'example.org',
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
          credentialsRef: {
            apiVersion: 'v1',
            kind: 'Secret',
            name: 'new-secret',
          },
        }],
      }

      shootDns.dnsDomain = 'example.com'

      expect(manifest.spec.dns.providers).toEqual([{
        primary: true,
        type: 'foo',
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          name: 'new-secret',
        },
      }])
    })

    it('should migrate old extension provider secretName to credentials when dns config changes', () => {
      manifest.spec.extensions = [{
        type: 'shoot-dns-service',
        providerConfig: {
          apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
          kind: 'DNSConfig',
          syncProvidersFromShootSpecDNS: false,
          providers: [{
            type: 'aws-route53',
            secretName: 'shoot-dns-service-aws-test',
            domains: {
              include: ['foo.bar'],
            },
          }, {
            type: 'aws-route53',
            credentials: 'shoot-dns-service-my-amazon-route-53-secret',
          }],
        },
      }]
      manifest.spec.dns = {
        domain: 'example.org',
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
        }],
      }

      shootDns.dnsDomain = 'example.com'

      expect(manifest.spec.extensions).toEqual([{
        type: 'shoot-dns-service',
        providerConfig: {
          apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
          kind: 'DNSConfig',
          syncProvidersFromShootSpecDNS: false,
          providers: [{
            type: 'aws-route53',
            credentials: 'shoot-dns-service-aws-test',
            domains: {
              include: ['foo.bar'],
            },
          }, {
            type: 'aws-route53',
            credentials: 'shoot-dns-service-my-amazon-route-53-secret',
          }],
        },
      }])
    })

    it('should drop legacy extension provider secretName when credentials is already set', () => {
      manifest.spec.extensions = [{
        type: 'shoot-dns-service',
        providerConfig: {
          apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
          kind: 'DNSConfig',
          syncProvidersFromShootSpecDNS: false,
          providers: [{
            type: 'aws-route53',
            secretName: 'legacy-resource-name',
            credentials: 'current-resource-name',
          }],
        },
      }]
      manifest.spec.dns = {
        domain: 'example.org',
        providers: [{
          primary: true,
          type: 'foo',
          secretName: 'legacy-secret',
        }],
      }

      shootDns.dnsDomain = 'example.com'

      expect(manifest.spec.extensions).toEqual([{
        type: 'shoot-dns-service',
        providerConfig: {
          apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
          kind: 'DNSConfig',
          syncProvidersFromShootSpecDNS: false,
          providers: [{
            type: 'aws-route53',
            credentials: 'current-resource-name',
          }],
        },
      }])
    })

    it('should fallback to provider credentialsRef when credential is not found in store', () => {
      shootDns.addDnsServiceExtensionProvider({
        type: 'foo',
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          name: 'bar',
        },
      })

      expect(manifest.spec).toMatchSnapshot()
    })

    it('should generate distinct dns service resources for same-name credentials with different kinds', () => {
      const credentialStore = useCredentialStore()
      const credentials = cloneDeep(global.fixtures.credentials)
      credentials.secrets.push({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          namespace: 'garden-test',
          name: 'shared-name',
          uid: 'secret-shared-name-uid',
          labels: {
            'dashboard.gardener.cloud/dnsProviderType': 'aws-route53',
          },
        },
      })
      credentials.workloadIdentities.push({
        apiVersion: 'security.gardener.cloud/v1alpha1',
        kind: 'WorkloadIdentity',
        metadata: {
          namespace: 'garden-test',
          name: 'shared-name',
          uid: 'wlid-shared-name-uid',
          labels: {
            'provider.extensions.gardener.cloud/aws-route53': 'true',
          },
        },
        spec: {
          targetSystem: {
            type: 'foo-infra',
          },
        },
      })
      credentialStore._setCredentials(credentials)

      shootDns.addDnsServiceExtensionProvider({
        type: 'aws-route53',
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          name: 'shared-name',
        },
      })
      shootDns.addDnsServiceExtensionProvider({
        type: 'aws-route53',
        credentialsRef: {
          apiVersion: 'security.gardener.cloud/v1alpha1',
          kind: 'WorkloadIdentity',
          name: 'shared-name',
        },
      })

      expect(manifest.spec.resources).toEqual([
        {
          name: 'shoot-dns-service-s-shared-name',
          resourceRef: {
            apiVersion: 'v1',
            kind: 'Secret',
            name: 'shared-name',
          },
        },
        {
          name: 'shoot-dns-service-wlid-shared-name',
          resourceRef: {
            apiVersion: 'security.gardener.cloud/v1alpha1',
            kind: 'WorkloadIdentity',
            name: 'shared-name',
          },
        },
      ])
      expect(shootDns.dnsServiceExtensionProviders).toEqual([
        {
          type: 'aws-route53',
          credentials: 'shoot-dns-service-s-shared-name',
        },
        {
          type: 'aws-route53',
          credentials: 'shoot-dns-service-wlid-shared-name',
        },
      ])
    })
  })
})
