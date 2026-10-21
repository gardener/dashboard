//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  nextTick,
  ref,
} from 'vue'
import { mount } from '@vue/test-utils'

import GManageWorkers from '@/components/ShootWorkers/GManageWorkers.vue'

const { createVuetifyPlugin } = global.fixtures.helper

vi.mock('@/components/ShootWorkers/GWorkerInputGeneric', () => ({
  default: {
    name: 'GWorkerInputGeneric',
    props: {
      worker: {
        type: Object,
        required: true,
      },
    },
    template: '<div data-test="worker-input">{{ worker.name }}</div>',
  },
}))

function createWorker (uid, name, machineType) {
  return {
    _uid: uid,
    name,
    machine: {
      architecture: 'amd64',
      type: machineType,
      image: {
        name: 'gardenlinux',
        version: '1592.4.0',
      },
    },
    zones: ['eu-west-1a'],
  }
}

function mockReducedMotion (matches) {
  vi.mocked(window.matchMedia).mockImplementation(query => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('components', () => {
  describe('g-manage-workers', () => {
    let wrapper
    let providerWorkers
    let workerless
    let mountTarget
    let addProviderWorker
    let duplicateProviderWorker
    let removeProviderWorker

    function mountComponent ({
      workers = [
        createWorker('worker-1', 'worker-one', 'm5.large'),
        createWorker('worker-2', 'worker-two', 'c5.large'),
      ],
      machineTypes = [{ name: 'm5.large' }],
      isWorkerless = false,
      expandByDefault = false,
      attachTo,
    } = {}) {
      providerWorkers = ref(workers)
      workerless = ref(isWorkerless)
      mountTarget = attachTo
      addProviderWorker = vi.fn(() => {
        providerWorkers.value = [
          ...providerWorkers.value,
          createWorker('worker-added', 'worker-added', 'm5.large'),
        ]
      })
      duplicateProviderWorker = vi.fn(index => {
        const worker = providerWorkers.value[index]
        providerWorkers.value = [
          ...providerWorkers.value.slice(0, index + 1),
          { ...worker, _uid: 'worker-duplicate', name: 'worker-duplicate' },
          ...providerWorkers.value.slice(index + 1),
        ]
      })
      removeProviderWorker = vi.fn(index => {
        providerWorkers.value = providerWorkers.value.filter((_, workerIndex) => workerIndex !== index)
      })

      wrapper = mount(GManageWorkers, {
        attachTo,
        props: {
          expandByDefault,
        },
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
          provide: {
            'shoot-context': {
              providerWorkers,
              workerless,
              allMachineTypes: ref(machineTypes),
              machineImages: ref([{
                name: 'gardenlinux',
                version: '1592.4.0',
                isDeprecated: false,
              }]),
              addProviderWorker,
              duplicateProviderWorker,
              removeProviderWorker,
            },
          },
        },
      })
    }

    function findButton (text) {
      return wrapper.findAll('button').find(button => button.text() === text)
    }

    function findWorkerGroup (name) {
      return wrapper.findAll('.worker-group-wrapper').find(group => group.text().includes(name))
    }

    async function expandWorker (name) {
      await findWorkerGroup(name).find('.v-expansion-panel-title').trigger('click')
      await nextTick()
    }

    beforeEach(() => {
      mockReducedMotion(false)
      mountComponent()
    })

    afterEach(() => {
      wrapper.unmount()
      mountTarget?.remove()
      vi.useRealTimers()
    })

    it('renders workers as virtualized expansion panels', async () => {
      expect(wrapper.findAll('.worker-group-wrapper')).toHaveLength(2)
      expect(wrapper.text()).toContain('amd64 / m5.large')
      expect(wrapper.findAll('[data-test="worker-input"]')).toHaveLength(0)
      expect(wrapper.findAll('button').some(button => button.text() === 'Duplicate')).toBe(false)
      expect(wrapper.findAll('button').some(button => button.text() === 'Remove')).toBe(false)

      const firstWorkerElement = findWorkerGroup('worker-one').element
      await expandWorker('worker-one')

      expect(findWorkerGroup('worker-one').element).toBe(firstWorkerElement)
      expect(wrapper.text()).not.toContain('amd64 / m5.large')
      expect(wrapper.text()).toContain('amd64 / c5.large')
      expect(wrapper.findAll('[data-test="worker-input"]')).toHaveLength(1)
      expect(wrapper.find('[data-test="worker-input"]').text()).toBe('worker-one')
      expect(wrapper.findAll('button').some(button => button.text() === 'Duplicate')).toBe(true)
      expect(wrapper.findAll('button').some(button => button.text() === 'Remove')).toBe(true)
    })

    it('expands existing and newly introduced workers by default when requested', async () => {
      wrapper.unmount()
      mountComponent({ expandByDefault: true })
      await nextTick()

      expect(wrapper.findAll('[data-test="worker-input"]').map(input => input.text())).toEqual([
        'worker-one',
        'worker-two',
      ])

      findWorkerGroup('worker-one')
        .findComponent({ name: 'VExpansionPanels' })
        .vm.$emit('update:modelValue', [])
      await nextTick()
      providerWorkers.value = [
        ...providerWorkers.value,
        createWorker('worker-3', 'worker-three', 'm5.large'),
      ]
      await nextTick()

      expect(findWorkerGroup('worker-one').findAll('button').some(button => button.text() === 'Duplicate')).toBe(false)
      expect(findWorkerGroup('worker-three').find('[data-test="worker-input"]').exists()).toBe(true)
    })

    it('finds the scroll container when switching from workerless mode', async () => {
      wrapper.unmount()
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })
      const scrollParent = document.createElement('div')
      scrollParent.style.overflowY = 'auto'
      Object.defineProperty(scrollParent, 'clientHeight', { configurable: true, value: 200 })
      document.body.append(scrollParent)
      mountComponent({
        workers: Array.from({ length: 100 }, (_, index) =>
          createWorker(`worker-${index}`, `worker-${index}`, 'm5.large'),
        ),
        isWorkerless: true,
        attachTo: scrollParent,
      })
      expect(wrapper.find('[data-test="worker-list"]').exists()).toBe(false)

      workerless.value = false
      await nextTick()
      await nextTick()

      const list = wrapper.get('[data-test="worker-list"]').element
      list.getBoundingClientRect = vi.fn(() => ({ top: -scrollParent.scrollTop }))
      scrollParent.getBoundingClientRect = vi.fn(() => ({ top: 0 }))
      expect(wrapper.find('.font-weight-medium').text()).toBe('worker-0')

      scrollParent.scrollTop = 2000
      scrollParent.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(20)
      await nextTick()

      expect(wrapper.find('.font-weight-medium').text()).not.toBe('worker-0')
    })

    it('keeps a lone worker collapsed and explains disabled worker actions', async () => {
      wrapper.unmount()
      mountComponent({
        workers: [createWorker('worker-1', 'worker-one', 'm5.large')],
        machineTypes: [],
      })
      await nextTick()

      expect(wrapper.findAll('[data-test="worker-input"]')).toHaveLength(0)
      expect(wrapper.findAll('button').some(button => button.text() === 'Duplicate')).toBe(false)
      expect(wrapper.findAll('button').some(button => button.text() === 'Remove')).toBe(false)

      await wrapper.find('.v-expansion-panel-title').trigger('click')
      await nextTick()

      const duplicateButton = wrapper.findAll('button').find(button => button.text() === 'Duplicate')
      const removeButton = wrapper.findAll('button').find(button => button.text() === 'Remove')
      const addButton = wrapper.findAll('button').find(button => button.text() === 'Add Worker Group')
      expect(duplicateButton.attributes('disabled')).toBeDefined()
      expect(removeButton.attributes('disabled')).toBeDefined()
      expect(addButton.attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="duplicate-worker-action"]').attributes('aria-describedby')).toMatch(/^v-tooltip-/)
      expect(wrapper.get('[data-test="remove-worker-action"]').attributes('aria-describedby')).toMatch(/^v-tooltip-/)
      expect(wrapper.get('[data-test="add-worker-action"]').attributes('aria-describedby')).toMatch(/^v-tooltip-/)

      const enabledTooltipTexts = wrapper
        .findAllComponents({ name: 'VTooltip' })
        .filter(tooltip => !tooltip.props('disabled'))
        .map(tooltip => tooltip.props('text'))
      expect(enabledTooltipTexts).toEqual([
        'No machine types are available in the selected cloud profile',
        'The last worker group cannot be removed',
        'No machine types are available in the selected cloud profile',
      ])

      await wrapper.get('[data-test="add-worker-action"]').trigger('mouseenter')
      await new Promise(resolve => setTimeout(resolve))
      await nextTick()
      const activeTooltip = document.body.querySelector('.v-tooltip.v-overlay--active')
      expect(activeTooltip?.textContent).toContain('No machine types are available in the selected cloud profile')
    })

    it('resets virtualized measurements to the expanded estimate for mass toggles', async () => {
      wrapper.unmount()
      mountComponent({
        workers: Array.from({ length: 100 }, (_, index) =>
          createWorker(`worker-${index}`, `worker-${index}`, 'm5.large'),
        ),
      })
      await nextTick()
      const collapsedPanelCount = wrapper.findAll('.v-expansion-panel').length
      const firstWorkerElement = findWorkerGroup('worker-0').element

      await findButton('Expand all').trigger('click')
      await nextTick()
      const expandedPanelCount = wrapper.findAll('.v-expansion-panel').length

      expect(expandedPanelCount).toBeGreaterThan(0)
      expect(expandedPanelCount).toBeLessThan(collapsedPanelCount)
      expect(findWorkerGroup('worker-0').element).toBe(firstWorkerElement)

      await findButton('Collapse all').trigger('click')
      await nextTick()

      expect(wrapper.findAll('.v-expansion-panel')).toHaveLength(collapsedPanelCount)
    })

    it('highlights newly added workers', async () => {
      const addWorkerButton = wrapper.findAll('button').find(button => button.text() === 'Add Worker Group')
      await addWorkerButton.trigger('click')
      await nextTick()

      expect(addProviderWorker).toHaveBeenCalledOnce()
      const addedWorker = wrapper.findAll('.worker-group-wrapper').find(worker => worker.text().includes('worker-added'))
      expect(addedWorker.classes()).toContain('worker-group--highlighted')
    })

    it('resets the estimate when workers are replaced while collapsed', async () => {
      wrapper.unmount()
      mountComponent({
        workers: Array.from({ length: 100 }, (_, index) =>
          createWorker(`worker-${index}`, `worker-${index}`, 'm5.large'),
        ),
      })
      await findButton('Expand all').trigger('click')
      await nextTick()
      const expandedPanelCount = wrapper.findAll('.v-expansion-panel').length

      providerWorkers.value = Array.from({ length: 100 }, (_, index) =>
        createWorker(`replacement-${index}`, `replacement-${index}`, 'm5.large'),
      )
      await nextTick()

      expect(wrapper.findAll('.v-expansion-panel').length).toBeGreaterThan(expandedPanelCount)
      expect(wrapper.text()).toContain('replacement-0')
    })

    it('reduces the rendered subset when expanding a large worker list', async () => {
      wrapper.unmount()
      mountComponent({
        workers: Array.from({ length: 100 }, (_, index) =>
          createWorker(`worker-${index}`, `worker-${index}`, 'm5.large'),
        ),
      })
      await nextTick()

      const collapsedPanelCount = wrapper.findAll('.v-expansion-panel').length
      expect(collapsedPanelCount).toBeGreaterThan(0)
      expect(collapsedPanelCount).toBeLessThan(providerWorkers.value.length)

      await findButton('Expand all').trigger('click')
      await nextTick()

      const expandedPanelCount = wrapper.findAll('.v-expansion-panel').length
      expect(expandedPanelCount).toBeGreaterThan(0)
      expect(expandedPanelCount).toBeLessThan(collapsedPanelCount)
    })

    it('removes a worker only after its collapse transition finishes', async () => {
      await expandWorker('worker-one')
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })

      await findWorkerGroup('worker-one').findAll('button').find(button => button.text() === 'Remove').trigger('click')

      expect(removeProviderWorker).not.toHaveBeenCalled()
      providerWorkers.value = [providerWorkers.value[1], providerWorkers.value[0]]
      await nextTick()
      vi.advanceTimersByTime(299)
      await Promise.resolve()
      expect(removeProviderWorker).not.toHaveBeenCalled()

      vi.advanceTimersByTime(32)
      await Promise.resolve()
      await nextTick()
      expect(removeProviderWorker).toHaveBeenCalledExactlyOnceWith(1)
    })

    it('finishes a pending removal before duplicating a later worker', async () => {
      wrapper.unmount()
      mountComponent({
        workers: [
          createWorker('worker-1', 'worker-one', 'm5.large'),
          createWorker('worker-2', 'worker-two', 'c5.large'),
          createWorker('worker-3', 'worker-three', 'm5.large'),
        ],
      })
      await expandWorker('worker-one')
      await expandWorker('worker-three')
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })

      await findWorkerGroup('worker-one').findAll('button').find(button => button.text() === 'Remove').trigger('click')
      await findWorkerGroup('worker-three').findAll('button').find(button => button.text() === 'Duplicate').trigger('click')

      expect(removeProviderWorker).toHaveBeenCalledExactlyOnceWith(0)
      expect(duplicateProviderWorker).toHaveBeenCalledExactlyOnceWith(1)
      expect(providerWorkers.value.map(worker => worker._uid)).toEqual([
        'worker-2',
        'worker-3',
        'worker-duplicate',
      ])
    })

    it('disables removal while another removal would leave no worker', async () => {
      await expandWorker('worker-one')
      await expandWorker('worker-two')
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })

      await findWorkerGroup('worker-one').findAll('button').find(button => button.text() === 'Remove').trigger('click')
      await nextTick()

      const remainingRemoveButton = findWorkerGroup('worker-two')
        .findAll('button')
        .find(button => button.text() === 'Remove')
      expect(remainingRemoveButton.attributes('disabled')).toBeDefined()
    })

    it('finishes add and remove transitions immediately with reduced motion', async () => {
      mockReducedMotion(true)

      await findButton('Add Worker Group').trigger('click')
      await nextTick()

      const addedWorker = findWorkerGroup('worker-added')
      expect(addedWorker.find('[data-test="worker-input"]').exists()).toBe(true)
      expect(addedWorker.element.style.height).toBe('')
      expect(addedWorker.element.style.overflow).toBe('')

      await addedWorker.findAll('button').find(button => button.text() === 'Remove').trigger('click')
      await Promise.resolve()
      await nextTick()

      expect(removeProviderWorker).toHaveBeenCalledExactlyOnceWith(2)
      expect(findWorkerGroup('worker-added')).toBeUndefined()
    })
  })
})
