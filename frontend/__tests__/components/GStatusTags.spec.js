//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useConfigStore } from '@/store/config'
import { useAuthnStore } from '@/store/authn'

import GStatusTags from '@/components/GStatusTags'

import { createShootItemComposable } from '@/composables/useShootItem'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-status-tags', () => {
    const lastTransitionTime = 'last-transition-time'

    let pinia

    function mountStatusTags (conditionTypes) {
      const shootItem = shallowRef({
        status: {
          conditions: conditionTypes.map(type => {
            return {
              type,
              lastTransitionTime,
              status: 'True',
            }
          }),
        },
      })
      return mount(GStatusTags, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
          provide: {
            'shoot-item': createShootItemComposable(shootItem),
          },
          stubs: {
            GStatusTag: true,
          },
        },
      })
    }

    beforeEach(() => {
      pinia = createTestingPinia({ stubActions: false })
      const authnStore = useAuthnStore(pinia) // eslint-disable-line no-unused-vars
      const configStore = useConfigStore(pinia)
      configStore.knownConditions = {
        ControlPlaneHealthy: {
          name: 'Control Plane Overwritten',
          shortName: 'CPO',
          description: 'Overwritten Description',
          sortOrder: '11',
        },
        ConditionFromConfigAvailability: {
          name: 'Config Condition',
          shortName: 'CC',
          description: 'Config Condition Description',
        },
        ImportantCondition: {
          name: 'Important Condition',
          shortName: 'IC',
          description: 'Important Config Condition Description',
          sortOrder: '0',
        },
      }
    })

    it('should generate condition object for simple condition type', () => {
      const type = 'SampleConditionAvailability'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toEqual({
        type,
        lastTransitionTime,
        shortName: 'SC',
        name: 'Sample Condition',
        sortOrder: '000000SC',
        status: 'True',
      })
    })

    it('should generate condition object for long condition type', () => {
      const type = 'ExtraLongSampleTESTConditionAvailable'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toEqual({
        type,
        lastTransitionTime,
        shortName: 'ELSTC',
        name: 'Extra Long Sample TEST Condition',
        sortOrder: '000ELSTC',
        status: 'True',
      })
    })

    it('should generate condition object for single condition type', () => {
      const type = 'Singlecondition'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toEqual({
        type,
        lastTransitionTime,
        shortName: 'S',
        name: 'Singlecondition',
        sortOrder: '0000000S',
        status: 'True',
      })
    })

    it('should return condition object for known condition types', () => {
      const type = 'APIServerAvailable'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toEqual({
        type,
        lastTransitionTime,
        shortName: 'API',
        name: 'API Server',
        sortOrder: '00000000',
        statusMappings: expect.any(Object),
        statusTextMappings: expect.any(Object),
        status: 'True',
        description: expect.stringContaining('kube-apiserver'),
      })
    })

    it('should return condition object for condition types loaded from config', () => {
      const type = 'ConditionFromConfigAvailability'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toEqual({
        type,
        lastTransitionTime,
        shortName: 'CC',
        name: 'Config Condition',
        sortOrder: '00000000',
        status: 'True',
        description: 'Config Condition Description',
      })
    })

    it('should return overwritten known condition with values from config', () => {
      const type = 'ControlPlaneHealthy'
      const wrapper = mountStatusTags([type])
      const condition = wrapper.vm.conditions[0]
      expect(condition).toMatchObject({
        type,
        lastTransitionTime,
        shortName: 'CPO',
        name: 'Control Plane Overwritten',
        sortOrder: '00000011',
        status: 'True',
        description: 'Overwritten Description',
      })
    })

    it('should return conditions sorted by sortOrder and shortname', () => {
      const wrapper = mountStatusTags([
        'ControlPlaneHealthy',
        'DE',
        'CE',
        'ImportantCondition',
      ])
      const shortNames = wrapper.vm.conditions.map(condition => condition.shortName)
      expect(shortNames).toEqual(['IC', 'C', 'D', 'CPO'])
    })
  })
})
