//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GVolumeType from '@/components/ShootWorkers/GVolumeType.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-volume-type', () => {
    function mountVolumeType ({ volumeType = 'io2' } = {}) {
      const pinia = createTestingPinia({ stubActions: false })
      useCloudProfileStore(pinia).setCloudProfiles([{
        metadata: {
          name: 'aws-profile',
          providerType: 'azure',
        },
        spec: {
          type: 'aws',
        },
      }])

      const worker = {
        volume: {
          type: volumeType,
        },
      }
      const wrapper = shallowMount(GVolumeType, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
        },
        props: {
          worker,
          volumeTypes: [
            { name: 'gp2' },
            { name: 'io1' },
            { name: 'io2' },
          ],
          cloudProfileRef: {
            kind: 'CloudProfile',
            name: 'aws-profile',
          },
          fieldName: 'Worker Volume Type',
        },
      })

      return { worker, wrapper }
    }

    it('preserves the AWS IOPS rules based on the cloud profile spec type', async () => {
      const { worker, wrapper } = mountVolumeType()

      expect(wrapper.vm.providerType).toBe('aws')
      expect(wrapper.vm.showIops).toBe(true)
      expect(wrapper.vm.isIopsRequired).toBe(true)

      wrapper.vm.onInputIops('200')
      expect(worker.providerConfig).toEqual({
        apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'WorkerConfig',
        volume: {
          iops: 200,
        },
      })

      wrapper.vm.worker.volume.type = 'gp2'
      await nextTick()

      expect(wrapper.vm.showIops).toBe(false)
      expect(wrapper.vm.isIopsRequired).toBe(false)
    })
  })
})
