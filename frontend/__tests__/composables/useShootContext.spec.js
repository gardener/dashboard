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
import { useSeedStore } from '@/store/seed'

import { createShootContextComposable } from '@/composables/useShootContext'

import cloneDeep from 'lodash/cloneDeep'

describe('composables', () => {
  let shootContextStore
  let configStore
  let seedStore

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
    authzStore._setNamespace('garden-test')
    configStore = useConfigStore()
    configStore.setConfiguration(global.fixtures.config)
    const credentialStore = useCredentialStore()
    credentialStore._setCredentials(global.fixtures.credentials)
    const cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.setCloudProfiles(cloneDeep(global.fixtures.cloudprofiles))
    const gardenerExtensionStore = useGardenerExtensionStore()
    gardenerExtensionStore.list = global.fixtures.gardenerExtensions
    seedStore = useSeedStore()
    const composable = createShootContextComposable({
      logger,
      appStore,
      authzStore,
      cloudProfileStore,
      configStore,
      gardenerExtensionStore,
      credentialStore,
      seedStore,
    })
    shootContextStore = reactive(composable)
  })

  function setShootDefaults (shootDefaults) {
    configStore.setConfiguration({
      ...cloneDeep(global.fixtures.config),
      shootDefaults,
    })
  }

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

    it('should omit spec.addons if no addon is enabled', () => {
      createShootManifest('aws')

      expect(shootContextStore.shootManifest.spec.addons).toBeUndefined()
    })

    it('should include spec.addons if an addon is enabled', () => {
      createShootManifest('aws')

      shootContextStore.setAddonEnabled('nginxIngress', true)

      expect(shootContextStore.shootManifest.spec.addons).toEqual({
        kubernetesDashboard: {
          enabled: false,
        },
        nginxIngress: {
          enabled: true,
        },
      })
    })

    it('should recreate spec.addons when enabling an addon after loading a manifest without addons', () => {
      shootContextStore.setShootManifest({
        metadata: {
          name: 'test-shoot',
        },
        spec: {
          provider: {
            workers: [
              {
                name: 'worker-test',
                minimum: 1,
                maximum: 2,
              },
            ],
          },
        },
      })

      expect(shootContextStore.shootManifest.spec.addons).toBeUndefined()

      shootContextStore.setAddonEnabled('nginxIngress', true)

      expect(shootContextStore.shootManifest.spec.addons).toEqual({
        nginxIngress: {
          enabled: true,
        },
      })
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

    it('should not mutate high availability state when reading or disabling it', () => {
      createShootManifest('aws')

      expect(shootContextStore.controlPlaneHighAvailability).toBe(false)
      expect(shootContextStore.controlPlaneHighAvailability).toBe(false)
      expect(shootContextStore.shootManifest.spec.controlPlane).toBeUndefined()
      expect(shootContextStore.isShootDirty).toBe(false)

      shootContextStore.controlPlaneHighAvailability = true
      expect(shootContextStore.controlPlaneHighAvailabilityFailureToleranceType).toBe('node')

      shootContextStore.controlPlaneHighAvailability = false
      expect(shootContextStore.controlPlaneHighAvailability).toBe(false)
      expect(shootContextStore.shootManifest.spec.controlPlane).toBeUndefined()
    })

    it('should apply a zone high availability default only when creating a shoot', () => {
      seedStore.list = [{
        metadata: {
          name: 'aws-seed',
        },
        spec: {
          provider: {
            type: 'aws',
            zones: ['zone-a', 'zone-b', 'zone-c'],
          },
          settings: {
            scheduling: {
              visible: true,
            },
          },
        },
      }]
      setShootDefaults({
        controlPlaneHighAvailability: true,
      })

      shootContextStore.createShootManifest({
        providerType: 'aws',
        workerless: false,
      })

      expect(shootContextStore.isFailureToleranceTypeZoneSupported).toBe(true)
      expect(shootContextStore.controlPlaneHighAvailabilityFailureToleranceType).toBe('zone')
      expect(shootContextStore.controlPlaneHighAvailability).toBe(true)
      expect(shootContextStore.isShootDirty).toBe(false)

      const existingShoot = cloneDeep(shootContextStore.shootManifest)
      existingShoot.metadata.creationTimestamp = '2024-03-01T12:00:00Z'
      delete existingShoot.spec.controlPlane
      shootContextStore.setShootManifest(existingShoot)

      expect(shootContextStore.controlPlaneHighAvailability).toBe(false)
      expect(shootContextStore.shootManifest.spec.controlPlane).toBeUndefined()
    })

    it('should restore a default worker when disabling workerless mode', () => {
      setShootDefaults({
        workerlessCluster: true,
      })

      shootContextStore.createShootManifest({
        providerType: 'aws',
      })

      expect(shootContextStore.workerless).toBe(true)
      expect(shootContextStore.shootManifest.spec.provider.workers).toBeUndefined()
      expect(shootContextStore.shootManifest.spec.networking).toBeUndefined()

      shootContextStore.workerless = false
      expect(shootContextStore.providerWorkers).toHaveLength(1)
      const workerName = shootContextStore.providerWorkers[0].name

      shootContextStore.workerless = true
      expect(shootContextStore.shootManifest.spec.provider.workers).toBeUndefined()

      shootContextStore.workerless = false
      expect(shootContextStore.providerWorkers).toHaveLength(1)
      expect(shootContextStore.providerWorkers[0].name).toBe(workerName)
    })

    it('should honor an explicit workerless option over the configured default', () => {
      setShootDefaults({
        workerlessCluster: true,
      })

      shootContextStore.createShootManifest({
        providerType: 'aws',
        workerless: false,
      })

      expect(shootContextStore.workerless).toBe(false)
      expect(shootContextStore.providerWorkers).toHaveLength(1)
    })

    it('should apply networking, worker, and maintenance defaults', () => {
      setShootDefaults({
        networkingType: 'cilium',
        autoscalerMin: 3,
        autoscalerMax: 2,
        maxSurge: '30%',
        zonesSelectAll: true,
        containerRuntime: 'unsupported',
        maintenanceHours: ['12'],
        maintenanceWindowSizeMinutes: 120,
        autoUpdateOS: false,
        autoUpdateKubernetes: false,
      })

      const shootManifest = createShootManifest('aws')
      const worker = shootContextStore.providerWorkers[0]

      expect(shootContextStore.networkingTypes).toEqual(['cilium', 'calico'])
      expect(shootManifest.spec.networking.type).toBe('cilium')
      expect(worker.minimum).toBe(3)
      expect(worker.maximum).toBe(Math.max(3, shootContextStore.allZones.length))
      expect(worker.maxSurge).toBe('30%')
      expect(worker.zones).toEqual(shootContextStore.allZones)
      expect(worker.cri.name).toBe('containerd')
      expect(shootManifest.spec.maintenance).toEqual({
        autoUpdate: {
          kubernetesVersion: false,
          machineImageVersion: false,
        },
        timeWindow: {
          begin: '120000+0100',
          end: '140000+0100',
        },
      })
    })

    it('should use a configured container runtime when the machine image supports it', () => {
      setShootDefaults({
        containerRuntime: 'docker',
      })

      createShootManifest('ironcore')

      expect(shootContextStore.providerWorkers[0].cri.name).toBe('docker')
    })

    it('should apply concrete defaults that match wildcard infrastructure constraints', () => {
      setShootDefaults({
        floatingPool: 'FloatingIP-external',
        loadBalancerProvider: 'f5',
      })

      const shootManifest = createShootManifest('openstack')

      expect(shootManifest.spec.provider.infrastructureConfig.floatingPoolName).toBe('FloatingIP-external')
      expect(shootManifest.spec.provider.controlPlaneConfig.loadBalancerProvider).toBe('f5')
    })

    it('should infer workerless mode whenever a manifest is loaded', () => {
      shootContextStore.setShootManifest({
        metadata: {
          name: 'workerless-shoot',
        },
        spec: {
          provider: {
            type: 'aws',
          },
        },
      })
      expect(shootContextStore.workerless).toBe(true)

      shootContextStore.setShootManifest({
        metadata: {
          name: 'shoot-with-workers',
        },
        spec: {
          provider: {
            type: 'aws',
            workers: [{
              name: 'worker-a',
              minimum: 1,
              maximum: 2,
            }],
          },
        },
      })
      expect(shootContextStore.workerless).toBe(false)
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

    it('should normalize legacy dns fields when loading a manifest', () => {
      shootContextStore.setShootManifest({
        metadata: {
          name: 'test-shoot',
        },
        spec: {
          dns: {
            domain: 'example.org',
            providers: [{
              primary: true,
              type: 'foo',
              secretName: 'legacy-secret',
            }],
          },
          extensions: [{
            type: 'shoot-dns-service',
            providerConfig: {
              apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
              kind: 'DNSConfig',
              syncProvidersFromShootSpecDNS: false,
              providers: [{
                type: 'aws-route53',
                secretName: 'legacy-resource-name',
              }],
            },
          }],
        },
      })

      expect(shootContextStore.dnsPrimaryProviderCredentialsRef).toEqual({
        apiVersion: 'v1',
        kind: 'Secret',
        name: 'legacy-secret',
      })
      expect(shootContextStore.shootManifest.spec.dns.providers).toEqual([{
        primary: true,
        type: 'foo',
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          name: 'legacy-secret',
        },
      }])
      expect(shootContextStore.shootManifest.spec.extensions).toEqual([{
        type: 'shoot-dns-service',
        providerConfig: {
          apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
          kind: 'DNSConfig',
          syncProvidersFromShootSpecDNS: false,
          providers: [{
            type: 'aws-route53',
            credentials: 'legacy-resource-name',
          }],
        },
      }])
    })
  })
})
