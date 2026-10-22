//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  nextTick,
  ref,
} from 'vue'
import { mount } from '@vue/test-utils'

import { useWorkersValidation } from '@/composables/useWorkersValidation'

function createWorker (uid, name = uid) {
  return {
    _uid: uid,
    name,
    minimum: 1,
    maximum: 1,
    maxSurge: 1,
    zones: ['eu-west-1a'],
    machine: {
      architecture: 'amd64',
      type: 'm5.large',
      image: {
        name: 'gardenlinux',
        version: '1592.4.0',
      },
    },
    cri: {
      name: 'containerd',
    },
  }
}

async function mountValidation (workers, cloudProfileVolumeTypes = []) {
  const providerWorkers = ref(workers)
  const ValidationHost = defineComponent({
    setup () {
      return {
        validation: useWorkersValidation(),
      }
    },
    template: '<div />',
  })
  const wrapper = mount(ValidationHost, {
    global: {
      provide: {
        'shoot-context': {
          providerWorkers,
          workerless: ref(false),
          isZonedCluster: ref(true),
          providerType: ref('aws'),
          cloudProfile: ref({
            spec: {
              type: 'aws',
              volumeTypes: cloudProfileVolumeTypes,
            },
          }),
          allMachineTypes: ref([{
            name: 'm5.large',
            architecture: 'amd64',
            storage: {
              minSize: '20Gi',
              size: '10Gi',
            },
          }]),
          volumeTypes: ref(cloudProfileVolumeTypes),
        },
      },
    },
  })
  await nextTick()
  return {
    providerWorkers,
    validation: wrapper.vm.validation,
    wrapper,
  }
}

describe('composables', () => {
  describe('useWorkersValidation', () => {
    it('requires a size while custom storage is enabled', async () => {
      const worker = createWorker('worker-1')
      worker.volume = { size: undefined }
      const { providerWorkers, validation, wrapper } = await mountValidation([worker])
      const volumeSizeValidation = validation['worker-1'].volume.size

      expect(volumeSizeValidation.$invalid).toBe(true)

      providerWorkers.value[0].volume.size = '9Gi'
      await nextTick()
      expect(volumeSizeValidation.$invalid).toBe(true)

      providerWorkers.value[0].volume.size = '10Gi'
      await nextTick()
      expect(volumeSizeValidation.$invalid).toBe(false)

      delete providerWorkers.value[0].volume
      await nextTick()
      expect(volumeSizeValidation.$invalid).toBe(false)
      wrapper.unmount()
    })

    it('requires IOPS for AWS io1 and io2 volumes', async () => {
      const worker = createWorker('worker-1')
      worker.volume = {
        type: 'io1',
        size: '20Gi',
      }
      const volumeTypes = [{ name: 'io1', minSize: '4Gi' }]
      const { providerWorkers, validation, wrapper } = await mountValidation([worker], volumeTypes)
      const iopsValidation = validation['worker-1'].providerConfig.volume.iops

      expect(iopsValidation.$invalid).toBe(true)

      providerWorkers.value[0].providerConfig = {
        volume: {
          iops: 100,
        },
      }
      await nextTick()
      expect(iopsValidation.$invalid).toBe(false)
      wrapper.unmount()
    })

    it('requires unique worker names', async () => {
      const workers = [
        createWorker('worker-1', 'duplicate'),
        createWorker('worker-2', 'duplicate'),
      ]
      const { providerWorkers, validation, wrapper } = await mountValidation(workers)

      expect(validation['worker-1'].name.$invalid).toBe(true)
      expect(validation['worker-2'].name.$invalid).toBe(true)

      providerWorkers.value[1].name = 'unique'
      await nextTick()
      expect(validation['worker-1'].name.$invalid).toBe(false)
      expect(validation['worker-2'].name.$invalid).toBe(false)
      wrapper.unmount()
    })
  })
})
