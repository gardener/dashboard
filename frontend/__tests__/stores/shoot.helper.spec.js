//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useShootContextStore } from '@/store/shootContext'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useSecretStore } from '@/store/secret'
import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'

import { cloneDeep } from '@/lodash'
describe('stores', () => {
  const context = {}
  const systemTime = new Date('2024-03-15T14:00:00+01:00')

  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(systemTime)
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    }
    const appStore = useAppStore()
    appStore.location = 'Europe/Berlin'
    appStore.timezone = '+01:00'
    const authzStore = useAuthzStore()
    authzStore.setNamespace('garden-test')
    const configStore = useConfigStore()
    configStore.setConfiguration(global.fixtures.config)
    const secretStore = useSecretStore()
    secretStore.list = global.fixtures.secrets
    const cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.setCloudProfiles(cloneDeep(global.fixtures.cloudprofiles))
    const gardenerExtensionStore = useGardenerExtensionStore()
    gardenerExtensionStore.list = global.fixtures.gardenerExtensions
    const shootContextStore = useShootContextStore()
    Object.assign(context, {
      logger,
      appStore,
      authzStore,
      configStore,
      secretStore,
      cloudProfileStore,
      gardenerExtensionStore,
      shootContextStore,
    })
  })

  function createShootManifest (infrastructureKind) {
    const {
      cloudProfileStore,
      shootContextStore,
    } = context
    const originalInfrastructureKindList = [
      ...cloudProfileStore.knownInfrastructureKindList,
    ]
    try {
      cloudProfileStore.knownInfrastructureKindList = [infrastructureKind]
      shootContextStore.$reset()
      return shootContextStore.shootManifest
    } finally {
      context.cloudProfileStore.knownInfrastructureKindList = originalInfrastructureKindList
    }
  }

  describe('shoot', () => {
    describe('helper', () => {
      it('should create a default "aws" shoot manifest', async () => {
        expect(createShootManifest('aws')).toMatchSnapshot()
      })

      it('should create a default "azure" shoot manifest', async () => {
        expect(createShootManifest('azure')).toMatchSnapshot()
      })

      it('should create a default "alicloud" shoot manifest', async () => {
        expect(createShootManifest('alicloud')).toMatchSnapshot()
      })

      it('should create a default "gcp" shoot manifest', async () => {
        expect(createShootManifest('gcp')).toMatchSnapshot()
      })

      it('should create a default "openstack" shoot manifest', async () => {
        expect(createShootManifest('openstack')).toMatchSnapshot()
      })

      it('should create a default "ironcore" shoot manifest', async () => {
        expect(createShootManifest('ironcore')).toMatchSnapshot()
      })

      it('should change the infrastructure kind', async () => {
        const { shootContextStore } = context
        shootContextStore.$reset()
        shootContextStore.providerType = 'gcp'
        expect(shootContextStore.shootManifest).toMatchSnapshot()
      })

      it('should add workers and update zones network config', async () => {
        const { shootContextStore } = context
        shootContextStore.$reset()

        let worker
        expect(shootContextStore.workers).toHaveLength(1)
        worker = shootContextStore.workers[0]
        worker.name = 'worker-a'
        worker.zones = shootContextStore.allZones.slice(1, 3)

        shootContextStore.addProviderWorker()
        expect(shootContextStore.workers).toHaveLength(2)
        worker = shootContextStore.workers[1]
        worker.name = 'worker-b'
        worker.zones = shootContextStore.allZones.slice(0, 2)

        const shootManifest = shootContextStore.shootManifest
        expect(shootManifest.spec.provider.workers).toMatchSnapshot()
        expect(shootManifest.spec.provider.infrastructureConfig.networks.zones).toMatchSnapshot()
      })

      it('should add dns providers', async () => {
        const { shootContextStore } = context
        shootContextStore.$reset()
        shootContextStore.addDnsProvider()
        shootContextStore.dnsDomain = 'example.org'
        expect(shootContextStore.dnsProviderIds).toHaveLength(1)
        const shootManifest = shootContextStore.shootManifest
        expect(shootManifest.spec.dns).toMatchSnapshot()
      })
    })
  })
})
