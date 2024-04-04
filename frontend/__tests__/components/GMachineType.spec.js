//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'

import GMachineType from '@/components/ShootWorkers/GMachineType.vue'

import {
  components as componentsPlugin,
  utils as utilsPlugin,
  notify as notifyPlugin,
} from '@/plugins'

import { map } from '@/lodash'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-machine-type', () => {
    const machineTypes = [
      {
        name: 'foo',
        cpu: '16',
        gpu: '0',
        memory: '128Gi',
      },
      {
        name: 'bar',
        cpu: '32',
        gpu: '0',
        memory: '256Gi',
      },
    ]

    function mountMachineType (props) {
      return mount(GMachineType, {
        global: {
          plugins: [
            ...createVuetifyPlugin(),
            componentsPlugin,
            utilsPlugin,
            notifyPlugin,
          ],
        },
        props,
      })
    }

    it('should filter machine types and select a different one', async () => {
      const wrapper = mountMachineType({
        modelValue: 'foo',
        machineTypes,
      })
      const autocompleteWrapper = wrapper.findComponent({
        ref: 'autocomplete',
      })

      const setInputValue = async value => {
        const inputElement = autocompleteWrapper.find('input')
        await inputElement.trigger('focus')
        await inputElement.setValue(value)
      }

      const getFilteredItems = () => {
        return map(autocompleteWrapper.vm.filteredItems, 'raw.name')
      }

      expect(wrapper.vm.notInList).toBe(false)
      expect(getFilteredItems()).toEqual(['foo', 'bar'])
      expect(autocompleteWrapper.emitted('update:search')).toBeFalsy()
      expect(wrapper.vm.v$.$invalid).toBe(false)

      await setInputValue('256Gi')
      expect(getFilteredItems()).toEqual(['bar'])
      expect(autocompleteWrapper.emitted('update:search')).toEqual([['foo'], ['256Gi']])
      expect(wrapper.vm.v$.$invalid).toBe(false)

      await setInputValue('bar')
      expect(getFilteredItems()).toEqual(['bar'])
      expect(autocompleteWrapper.emitted('update:search')).toEqual([['foo'], ['256Gi'], ['bar']])
      expect(wrapper.vm.v$.$invalid).toBe(false)

      await setInputValue(null)
      expect(getFilteredItems()).toEqual(['foo', 'bar'])
      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.vm.v$.internalValue.required.$message).toBe('Value is required')
    })
  })
})
