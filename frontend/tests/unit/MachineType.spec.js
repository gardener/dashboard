//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
import map from 'lodash/map'

// Components
import MachineType from '@/components/ShootWorkers/MachineType'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('MachineType.vue', () => {
  const machineTypes = [
    {
      name: 'foo',
      cpu: '16',
      gpu: '0',
      memory: '128Gi'
    },
    {
      name: 'bar',
      cpu: '32',
      gpu: '0',
      memory: '256Gi'
    }
  ]
  const localVue = createLocalVue()

  localVue.use(Vuetify)
  localVue.use(Vuelidate)

  let vuetify
  let machineType

  beforeEach(() => {
    vuetify = new Vuetify()
    machineType = 'foo'
  })

  it('should filter machine types and select a different one', async () => {
    const wrapper = mount(MachineType, {
      localVue,
      vuetify,
      propsData: {
        value: machineType,
        machineTypes
      }
    })
    expect(wrapper.vm.notInList).toBe(false)
    const autocomplete = wrapper.findComponent({ ref: 'autocomplete' })
    expect(map(autocomplete.vm.filteredItems, 'name')).toEqual(['foo', 'bar'])

    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:valid')).toEqual([[true]])

    await wrapper.setProps({ searchInput: '256Gi' })
    expect(map(autocomplete.vm.filteredItems, 'name')).toEqual(['bar'])

    expect(wrapper.emitted('input')).toBeFalsy()
    autocomplete.vm.$emit('input', 'bar')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('input')).toEqual([['bar']])
  })
})
