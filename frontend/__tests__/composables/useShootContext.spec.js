//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { reactive } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'

import { createShootContextComposable } from '@/composables/useShootContext'

import cloneDeep from 'lodash/cloneDeep'

describe('composables', () => {
  let shootContextStore

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
    const credentialStore = useCredentialStore()
    credentialStore._setCredentials(global.fixtures.credentials)
    const cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.setCloudProfiles(cloneDeep(global.fixtures.cloudprofiles))
    const gardenerExtensionStore = useGardenerExtensionStore()
    gardenerExtensionStore.list = global.fixtures.gardenerExtensions
    const composable = createShootContextComposable({
      logger,
      appStore,
      authzStore,
      cloudProfileStore,
      configStore,
      gardenerExtensionStore,
      credentialStore,
    })
    shootContextStore = reactive(composable)
  })

  function createShootManifest (providerType) {
    shootContextStore.createShootManifest({
      providerType,
      workerless: false,
    })
    return shootContextStore.shootManifest
  }

  describe('useShootContext', () => {
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
      shootContextStore.createShootManifest()
      shootContextStore.providerType = 'gcp'
      expect(shootContextStore.shootManifest).toMatchSnapshot()
    })

    it('should change to credentials binding', async () => {
      shootContextStore.createShootManifest()
      shootContextStore.infrastructureBinding = global.fixtures.credentials.credentialsBindings.filter(({ provider }) => provider.type === shootContextStore.shootManifest.spec.provider.type)[0]
      expect(shootContextStore.shootManifest).toMatchSnapshot()
    })

    it('should add workers and update zones network config', async () => {
      shootContextStore.createShootManifest()

      let worker
      expect(shootContextStore.providerWorkers).toHaveLength(1)
      worker = shootContextStore.providerWorkers[0]
      worker.name = 'worker-a'
      worker.zones = shootContextStore.allZones.slice(1, 3)

      shootContextStore.addProviderWorker()
      expect(shootContextStore.providerWorkers).toHaveLength(2)
      worker = shootContextStore.providerWorkers[1]
      worker.name = 'worker-b'
      worker.zones = shootContextStore.allZones.slice(0, 2)

      const shootManifest = shootContextStore.shootManifest
      expect(shootManifest.spec.provider.workers).toMatchSnapshot()
      expect(shootManifest.spec.provider.infrastructureConfig.networks.zones).toMatchSnapshot()
    })
  })
})
