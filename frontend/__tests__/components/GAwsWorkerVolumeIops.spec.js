//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

import GAwsWorkerVolumeIops from '@/providers/infra/aws/GAwsWorkerVolumeIops.vue'

function mountComponent (worker) {
  return shallowMount(GAwsWorkerVolumeIops, {
    props: {
      worker,
      fieldName: 'Volume Type',
    },
    global: {
      stubs: {
        VTextField: {
          props: ['label'],
          template: '<div class="v-text-field" :data-label="label" />',
        },
      },
    },
  })
}

describe('GAwsWorkerVolumeIops', () => {
  it('renders and validates IOPS for AWS volume types that require it', async () => {
    const worker = {
      volume: {
        type: 'io1',
      },
    }
    const wrapper = mountComponent(worker)

    expect(wrapper.find('[data-label="IOPS"]').exists()).toBe(true)
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.workerIops.required.$invalid).toBe(true)

    wrapper.vm.onInputIops('99')
    await nextTick()
    expect(wrapper.vm.v$.workerIops.minValue.$invalid).toBe(true)

    wrapper.vm.onInputIops('300')
    await nextTick()
    expect(worker.providerConfig).toEqual({
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
      volume: {
        iops: 300,
      },
    })
    expect(wrapper.emitted('updateVolumeType')).toHaveLength(2)
    expect(wrapper.vm.v$.workerIops.required.$invalid).toBe(false)
    expect(wrapper.vm.v$.workerIops.minValue.$invalid).toBe(false)

    wrapper.vm.onInputIops('')
    expect(worker.providerConfig).toEqual({
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
    })

    wrapper.unmount()
  })

  it.each([
    ['gp2', false],
    ['gp3', true],
  ])('removes configured IOPS when switching to the non-required %s volume type', async (volumeType, iopsFieldVisible) => {
    const worker = {
      volume: {
        type: 'io2',
      },
      providerConfig: {
        apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'WorkerConfig',
        volume: {
          iops: 500,
        },
      },
    }
    const wrapper = mountComponent(worker)

    expect(wrapper.vm.workerIops).toBe(500)

    wrapper.vm.worker.volume.type = volumeType
    await nextTick()
    expect(worker.providerConfig).toEqual({
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
    })
    expect(wrapper.vm.workerIops).toBeUndefined()
    expect(wrapper.find('[data-label="IOPS"]').exists()).toBe(iopsFieldVisible)

    wrapper.unmount()
  })

  it('preserves unrelated worker provider configuration when removing IOPS', async () => {
    const worker = {
      volume: {
        type: 'io2',
      },
      providerConfig: {
        apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'WorkerConfig',
        volume: {
          iops: 500,
          throughput: 125,
        },
        dataVolumes: [{ name: 'data' }],
      },
    }
    const wrapper = mountComponent(worker)

    wrapper.vm.worker.volume.type = 'gp3'
    await nextTick()

    expect(worker.providerConfig).toEqual({
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
      volume: {
        throughput: 125,
      },
      dataVolumes: [{ name: 'data' }],
    })
    expect(wrapper.vm.workerIops).toBeUndefined()

    wrapper.unmount()
  })

  it('removes an otherwise empty worker provider configuration after removing IOPS', async () => {
    const worker = {
      volume: {
        type: 'io2',
      },
      providerConfig: {
        volume: {
          iops: 500,
        },
      },
    }
    const wrapper = mountComponent(worker)

    wrapper.vm.worker.volume.type = 'gp2'
    await nextTick()

    expect(worker).not.toHaveProperty('providerConfig')
    expect(wrapper.vm.workerIops).toBeUndefined()

    wrapper.unmount()
  })
})
