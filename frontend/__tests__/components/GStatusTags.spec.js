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

const originalRequestAnimationFrame = window.requestAnimationFrame
const originalCancelAnimationFrame = window.cancelAnimationFrame

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
      window.requestAnimationFrame = callback => {
        callback()
        return 1
      }
      window.cancelAnimationFrame = () => {}

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

    afterEach(() => {
      vi.useRealTimers()
      window.requestAnimationFrame = originalRequestAnimationFrame
      window.cancelAnimationFrame = originalCancelAnimationFrame
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

    it('should auto scroll right when hovering near the right edge', async () => {
      const wrapper = mountStatusTags(['APIServerAvailable'])
      const scrollContainer = document.createElement('div')
      Object.defineProperties(scrollContainer, {
        scrollLeft: {
          value: 0,
          writable: true,
        },
        scrollWidth: {
          value: 200,
        },
        clientWidth: {
          value: 100,
        },
      })
      scrollContainer.getBoundingClientRect = () => ({
        left: 0,
        right: 100,
      })

      wrapper.vm.containerRef = wrapper.element
      wrapper.vm.containerRef.closest = vi.fn().mockReturnValue(scrollContainer)

      wrapper.vm.onMouseMove({ clientX: 95 })
      await wrapper.vm.$nextTick()

      expect(scrollContainer.scrollLeft).toBeGreaterThan(0)
    })

    it('should stop auto scroll when cursor moves away from the edge', async () => {
      const wrapper = mountStatusTags(['APIServerAvailable'])
      const scrollContainer = document.createElement('div')
      Object.defineProperties(scrollContainer, {
        scrollLeft: {
          value: 10,
          writable: true,
        },
        scrollWidth: {
          value: 200,
        },
        clientWidth: {
          value: 100,
        },
      })
      scrollContainer.getBoundingClientRect = () => ({
        left: 0,
        right: 100,
      })

      wrapper.vm.containerRef = wrapper.element
      wrapper.vm.containerRef.closest = vi.fn().mockReturnValue(scrollContainer)

      wrapper.vm.onMouseMove({ clientX: 50 })
      await wrapper.vm.$nextTick()

      expect(scrollContainer.scrollLeft).toBe(10)
    })

    it('should scroll back to the start when the chips collapse', async () => {
      vi.useFakeTimers()
      const wrapper = mountStatusTags(['APIServerAvailable'])
      const scrollContainer = document.createElement('div')
      scrollContainer.scrollTo = vi.fn()

      wrapper.vm.containerRef = wrapper.element
      wrapper.vm.containerRef.closest = vi.fn().mockReturnValue(scrollContainer)

      wrapper.vm.onMouseEnter()
      wrapper.vm.onMouseLeave()
      await vi.advanceTimersByTimeAsync(3500)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.hovered).toBe(false)

      expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
        left: 0,
        behavior: 'smooth',
      })
    })
  })
})
