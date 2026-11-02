//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
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

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric.vue'

import { createShootContextComposable } from '@/composables/useShootContext'

import {
  components as componentsPlugin,
  utils as utilsPlugin,
  notify as notifyPlugin,
} from '@/plugins'

import cloneDeep from 'lodash/cloneDeep'
import find from 'lodash/find'
import map from 'lodash/map'
import set from 'lodash/set'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-worker-input-generic', () => {
    let shootContext

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-03-15T14:00:00+01:00'))
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    // Builds a shoot context backed by the real stores. When `augmentInPlace` is true the gardenlinux
    // 1312.3.0 image version advertises in-place update support so the strategy logic can be exercised.
    function buildShootContext ({ augmentInPlace = true } = {}) {
      setActivePinia(createPinia())
      const logger = { warn: vi.fn(), error: vi.fn() }
      const appStore = useAppStore()
      appStore.location = 'Europe/Berlin'
      appStore.timezone = '+01:00'
      const authzStore = useAuthzStore()
      authzStore._setNamespace('garden-test')
      const configStore = useConfigStore()
      configStore.setConfiguration(global.fixtures.config)
      const credentialStore = useCredentialStore()
      credentialStore._setCredentials(global.fixtures.credentials)

      const cloudProfiles = cloneDeep(global.fixtures.cloudprofiles)
      if (augmentInPlace) {
        for (const cloudProfile of cloudProfiles) {
          const gardenlinux = find(cloudProfile.spec.machineImages, ['name', 'gardenlinux'])
          const inPlaceVersions = (gardenlinux?.versions ?? []).filter(v => ['1312.3.0', '1312.2.0'].includes(v.version))
          for (const version of inPlaceVersions) {
            version.inPlaceUpdates = { supported: true, minVersionForUpdate: '1312.0.0' }
          }
        }
      }
      const cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.setCloudProfiles(cloudProfiles)
      const gardenerExtensionStore = useGardenerExtensionStore()
      gardenerExtensionStore.list = global.fixtures.gardenerExtensions
      const seedStore = useSeedStore()

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
      composable.createShootManifest({ providerType: 'aws', workerless: false })
      return composable
    }

    beforeEach(() => {
      shootContext = buildShootContext()
    })

    function mountWorkerInput ({ image } = {}) {
      const worker = shootContext.providerWorkers.value[0]
      if (image) {
        worker.machine.image = image
      }
      const wrapper = mount(GWorkerInputGeneric, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            componentsPlugin,
            utilsPlugin,
            notifyPlugin,
          ],
          provide: {
            'shoot-context': shootContext,
          },
        },
        props: { worker },
      })
      return { wrapper, worker }
    }

    // Simulate an existing (already created) worker pool with an in-place update strategy whose
    // committed machine image version is `committedVersion`.
    function mountExistingWorker (committedVersion) {
      const manifest = cloneDeep(shootContext.shootManifest.value)
      const generated = manifest.spec.provider.workers[0]
      set(manifest, ['metadata', 'creationTimestamp'], '2024-01-01T00:00:00Z')
      set(manifest, ['spec', 'provider', 'workers'], [{
        name: 'worker-existing',
        minimum: 1,
        maximum: 2,
        maxSurge: 0,
        maxUnavailable: 1,
        updateStrategy: 'AutoInPlaceUpdate',
        machine: {
          type: generated.machine.type,
          image: { name: 'gardenlinux', version: committedVersion },
          architecture: generated.machine.architecture,
        },
        zones: generated.zones,
        cri: { name: 'containerd' },
        volume: generated.volume,
      }])
      shootContext.setShootManifest(manifest)
      const worker = shootContext.providerWorkers.value[0]
      const wrapper = mount(GWorkerInputGeneric, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            componentsPlugin,
            utilsPlugin,
            notifyPlugin,
          ],
          provide: {
            'shoot-context': shootContext,
          },
        },
        props: { worker },
      })
      return { wrapper, worker }
    }

    it('defaults to AutoRollingUpdate without persisting the field', () => {
      const { wrapper, worker } = mountWorkerInput()
      expect(wrapper.vm.updateStrategy).toBe('AutoRollingUpdate')
      expect(worker.updateStrategy).toBeUndefined()
      expect(wrapper.vm.isInPlaceUpdate).toBe(false)
      expect(wrapper.vm.isManualInPlaceUpdate).toBe(false)
    })

    it('offers all strategy options and keeps them selectable regardless of the current image', async () => {
      // start on a version without in-place support; options must still be selectable
      const { wrapper } = mountWorkerInput({ image: { name: 'gardenlinux', version: '1443.0.0' } })
      expect(wrapper.vm.inPlaceUpdatePossible).toBe(true)
      expect(wrapper.vm.workerUpdateStrategies).toEqual(['AutoRollingUpdate', 'AutoInPlaceUpdate', 'ManualInPlaceUpdate'])
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.updateStrategy).toBe('AutoInPlaceUpdate')
    })

    it('allows selecting in-place even when no image supports it, leaving the image list empty', async () => {
      shootContext = buildShootContext({ augmentInPlace: false })
      const { wrapper } = mountWorkerInput()
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.updateStrategy).toBe('AutoInPlaceUpdate')
      expect(wrapper.vm.inPlaceUpdatePossible).toBe(false)
      expect(wrapper.vm.filteredMachineImages).toHaveLength(0)
    })

    it('adjusts maxSurge/maxUnavailable when switching to AutoInPlaceUpdate', () => {
      const { wrapper, worker } = mountWorkerInput()
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      expect(worker.updateStrategy).toBe('AutoInPlaceUpdate')
      expect(worker.maxSurge).toBe(0)
      expect(worker.maxUnavailable).toBe(1)
      expect(wrapper.vm.isInPlaceUpdate).toBe(true)
      expect(wrapper.vm.isManualInPlaceUpdate).toBe(false)
      // Max. Unavailable is only shown for AutoInPlaceUpdate
      expect(wrapper.vm.isAutoInPlaceUpdate).toBe(true)
    })

    it('unsets maxSurge/maxUnavailable for ManualInPlaceUpdate', () => {
      const { wrapper, worker } = mountWorkerInput()
      wrapper.vm.updateStrategy = 'ManualInPlaceUpdate'
      expect(worker.updateStrategy).toBe('ManualInPlaceUpdate')
      expect(worker.maxSurge).toBeUndefined()
      expect(worker.maxUnavailable).toBeUndefined()
      expect(wrapper.vm.isManualInPlaceUpdate).toBe(true)
      expect(wrapper.vm.isAutoInPlaceUpdate).toBe(false)
    })

    it('restores rolling defaults and hides Max. Unavailable when switching back to AutoRollingUpdate', () => {
      const { wrapper, worker } = mountWorkerInput()
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      wrapper.vm.updateStrategy = 'AutoRollingUpdate'
      expect(worker.updateStrategy).toBeUndefined()
      expect(worker.maxSurge).toBe(wrapper.vm.configStore.defaultMaxSurge)
      expect(worker.maxUnavailable).toBeUndefined()
      // Max. Unavailable is hidden for the rolling update strategy
      expect(wrapper.vm.isAutoInPlaceUpdate).toBe(false)
    })

    it('auto-selects an in-place compatible image when switching to in-place from an unsupported image', async () => {
      // the user starts on an image without in-place support and switches the strategy
      const { wrapper, worker } = mountWorkerInput({ image: { name: 'gardenlinux', version: '1443.0.0' } })
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      await wrapper.vm.$nextTick()
      // strategy is NOT reverted; instead the image is switched to an eligible default
      expect(wrapper.vm.updateStrategy).toBe('AutoInPlaceUpdate')
      expect(worker.updateStrategy).toBe('AutoInPlaceUpdate')
      expect(worker.machine.image).toEqual({ name: 'gardenlinux', version: '1312.3.0' })
    })

    it('shows all available images (including in-place ones) for the rolling strategy', () => {
      const { wrapper } = mountWorkerInput()
      expect(wrapper.vm.updateStrategy).toBe('AutoRollingUpdate')
      const versions = map(wrapper.vm.filteredMachineImages, 'version')
      expect(versions).toContain('1312.3.0') // in-place image is allowed for rolling
      expect(versions).toContain('1443.0.0')
    })

    it('shows only in-place images for an in-place strategy (new worker)', async () => {
      const { wrapper } = mountWorkerInput()
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      await wrapper.vm.$nextTick()
      const versions = map(wrapper.vm.filteredMachineImages, 'version')
      expect(versions).toContain('1312.3.0')
      expect(versions).toContain('1312.2.0') // also has inPlaceUpdates.supported: true
      expect(versions).not.toContain('1443.0.0') // non-in-place images are hidden
    })

    it('keeps the in-place image when switching back to rolling', async () => {
      const { wrapper, worker } = mountWorkerInput({ image: { name: 'gardenlinux', version: '1312.3.0' } })
      wrapper.vm.updateStrategy = 'AutoInPlaceUpdate'
      await wrapper.vm.$nextTick()
      expect(worker.machine.image.version).toBe('1312.3.0')
      wrapper.vm.updateStrategy = 'AutoRollingUpdate'
      await wrapper.vm.$nextTick()
      // rolling accepts the image, so the selection is preserved
      expect(worker.machine.image.version).toBe('1312.3.0')
      expect(map(wrapper.vm.filteredMachineImages, 'version')).toContain('1312.3.0')
    })

    it('offers an eligible in-place version plus the current version for an existing worker', () => {
      const { wrapper } = mountExistingWorker('1312.2.0')
      expect(wrapper.vm.isInPlaceUpdate).toBe(true)
      const versions = map(wrapper.vm.filteredMachineImages, 'version')
      expect(versions).toContain('1312.3.0') // eligible update target
      expect(versions).toContain('1312.2.0') // the current (committed) version is always offered
      expect(versions).not.toContain('1443.0.0')
    })

    it('keeps the current version selectable after picking an update target', async () => {
      const { wrapper, worker } = mountExistingWorker('1312.2.0')
      // user selects the update target
      worker.machine.image = { name: 'gardenlinux', version: '1312.3.0' }
      await wrapper.vm.$nextTick()
      // the originally installed version must remain in the list so the user can revert to it
      expect(map(wrapper.vm.filteredMachineImages, 'version')).toContain('1312.2.0')
    })

    it('hides an in-place version when the committed version is below minVersionForUpdate', () => {
      const { wrapper } = mountExistingWorker('1311.0.0')
      expect(wrapper.vm.isInPlaceUpdate).toBe(true)
      const versions = map(wrapper.vm.filteredMachineImages, 'version')
      expect(versions).not.toContain('1312.3.0')
    })

    it('does not offer older versions as in-place update targets (no downgrade)', () => {
      const { wrapper } = mountExistingWorker('1312.3.0')
      const versions = map(wrapper.vm.filteredMachineImages, 'version')
      expect(versions).toContain('1312.3.0') // committed version always shown
      expect(versions).not.toContain('1312.2.0') // older version must not appear
    })
  })
})
