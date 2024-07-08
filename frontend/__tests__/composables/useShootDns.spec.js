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
import { useSecretStore } from '@/store/secret'

import { useShootDns } from '@/composables/useShootDns'

describe('composables', () => {
  describe('useShootDns', () => {
    const manifest = reactive({})
    let shootDns

    beforeEach(() => {
      setActivePinia(createPinia())
      manifest.spec = {}
      const secretStore = useSecretStore()
      secretStore.list = global.fixtures.secrets
      const gardenerExtensionStore = useGardenerExtensionStore()
      gardenerExtensionStore.list = global.fixtures.gardenerExtensions

      const composable = useShootDns(toRef(manifest), {
        gardenerExtensionStore,
        secretStore,
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
      shootDns.dnsPrimaryProviderSecretName = 'bar'

      expect(manifest.spec).toMatchSnapshot()
    })

    it('should add extension custom domain dns provider', () => {
      shootDns.dnsDomain = 'example.org'
      shootDns.dnsPrimaryProviderType = 'foo'
      shootDns.dnsPrimaryProviderSecretName = 'bar'

      expect(shootDns.hasDnsServiceExtensionProviderForCustomDomain).toBe(false)

      shootDns.addDnsServiceExtensionProviderForCustomDomain()
      expect(shootDns.hasDnsServiceExtensionProviderForCustomDomain).toBe(true)

      expect(manifest.spec).toMatchSnapshot()
    })
  })
})
