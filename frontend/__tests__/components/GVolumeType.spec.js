//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'
import { shallowMount } from '@vue/test-utils'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GVolumeType from '@/components/ShootWorkers/GVolumeType.vue'

import GAwsWorkerVolumeIops from '@/providers/infra/aws/GAwsWorkerVolumeIops.vue'

describe('GVolumeType', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCloudProfileStore().setCloudProfiles([
      {
        metadata: { name: 'aws-profile' },
        spec: { type: 'aws' },
      },
      {
        metadata: { name: 'azure-profile' },
        spec: { type: 'azure' },
      },
    ])
  })

  it('routes AWS volume UI props and events through the provider registry', async () => {
    const worker = {
      volume: {
        type: 'io1',
      },
    }
    const wrapper = shallowMount(GVolumeType, {
      props: {
        worker,
        cloudProfileRef: {
          name: 'aws-profile',
          kind: 'CloudProfile',
        },
        fieldName: 'Volume Type',
      },
    })

    const awsVolume = wrapper.findComponent(GAwsWorkerVolumeIops)
    expect(awsVolume.exists()).toBe(true)
    expect(awsVolume.props()).toMatchObject({
      worker,
      fieldName: 'Volume Type',
    })

    const updateCount = wrapper.emitted('updateVolumeType')?.length ?? 0
    awsVolume.vm.$emit('updateVolumeType')
    expect(wrapper.emitted('updateVolumeType')).toHaveLength(updateCount + 1)

    await wrapper.setProps({
      cloudProfileRef: {
        name: 'azure-profile',
        kind: 'CloudProfile',
      },
    })
    expect(wrapper.findComponent(GAwsWorkerVolumeIops).exists()).toBe(false)

    wrapper.unmount()
  })
})
