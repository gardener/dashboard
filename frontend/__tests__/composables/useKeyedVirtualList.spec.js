//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  h,
  nextTick,
  ref,
} from 'vue'
import { mount } from '@vue/test-utils'

import { useKeyedVirtualList } from '@/composables/useKeyedVirtualList'

function createItems (count) {
  return Array.from({ length: count }, (_, index) => ({ id: `item-${index}` }))
}

describe('useKeyedVirtualList', () => {
  let wrapper
  let items
  let openKeys
  let virtualList

  function mountList (count = 20) {
    items = ref(createItems(count))
    openKeys = ref(new Set())
    wrapper = mount(defineComponent({
      setup () {
        virtualList = useKeyedVirtualList({
          items,
          getKey: item => item.id,
          estimateSize: item => openKeys.value.has(item.id) ? 500 : 100,
          overscan: 0,
        })
        return () => h('div', { style: 'overflow-y: auto' }, [
          h('div', {
            ref: virtualList.listRef,
            style: {
              paddingTop: `${virtualList.paddingTop.value}px`,
              paddingBottom: `${virtualList.paddingBottom.value}px`,
            },
          }, virtualList.virtualItems.value.map(({ item, key }) => h('div', {
            key,
            ref: element => virtualList.measureElement(key, element),
            'data-key': key,
          }, item.id))),
        ])
      },
    }))
  }

  function getItemResizeObserver () {
    const ResizeObserverMock = vi.mocked(window.ResizeObserver)
    const observerIndex = ResizeObserverMock.mock.results.findIndex(result =>
      result.value.observe.mock.calls.some(([element]) => element.dataset?.key),
    )
    expect(observerIndex).toBeGreaterThanOrEqual(0)
    return {
      callback: ResizeObserverMock.mock.calls.at(observerIndex)[0],
      observer: ResizeObserverMock.mock.results.at(observerIndex).value,
    }
  }

  function measure (sizes) {
    const entries = Object.entries(sizes).map(([key, blockSize]) => ({
      target: wrapper.get(`[data-key="${key}"]`).element,
      borderBoxSize: [{ blockSize }],
    }))
    getItemResizeObserver().callback(entries)
  }

  beforeEach(() => {
    vi.mocked(window.ResizeObserver).mockClear()
    mountList()
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('keeps measured sizes by key across insertions and removals', async () => {
    measure({ 'item-0': 500 })
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)

    items.value = [{ id: 'inserted' }, ...items.value]
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)

    items.value = items.value.filter(item => item.id !== 'inserted')
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)
  })

  it('renders a pinned key and keeps the rendered range contiguous', async () => {
    expect(wrapper.findAll('[data-key]')).toHaveLength(8)

    virtualList.pin('item-15')
    await nextTick()

    const renderedKeys = wrapper.findAll('[data-key]').map(item => item.attributes('data-key'))
    expect(renderedKeys).toEqual(createItems(16).map(item => item.id))
  })

  it('updates estimates when item state changes', async () => {
    expect(wrapper.findAll('[data-key]')).toHaveLength(8)

    openKeys.value = new Set(items.value.map(item => item.id))
    await nextTick()

    expect(wrapper.findAll('[data-key]')).toHaveLength(2)
  })

  it('uses new estimates after measurements are reset', async () => {
    const initialSizes = Object.fromEntries(
      wrapper.findAll('[data-key]').map(item => [item.attributes('data-key'), 50]),
    )
    measure(initialSizes)
    await nextTick()

    openKeys.value = new Set(items.value.map(item => item.id))
    await nextTick()
    const measuredRangeSize = wrapper.findAll('[data-key]').length

    virtualList.resetMeasurements()
    await nextTick()

    expect(measuredRangeSize).toBeGreaterThan(2)
    expect(wrapper.findAll('[data-key]')).toHaveLength(2)
  })

  it('re-observes rendered items when measurements are reset', async () => {
    measure({ 'item-0': 500 })
    await nextTick()
    const { observer } = getItemResizeObserver()
    const renderedCount = wrapper.findAll('[data-key]').length
    observer.observe.mockClear()
    observer.unobserve.mockClear()

    virtualList.resetMeasurements()

    expect(observer.unobserve).toHaveBeenCalledTimes(renderedCount)
    expect(observer.observe).toHaveBeenCalledTimes(renderedCount)
  })

  it('ignores zero-height measurements', async () => {
    measure({ 'item-0': 0 })
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(8)

    measure({ 'item-0': 500 })
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)

    measure({ 'item-0': 0 })
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)
  })

  it('prunes measurements for removed keys', async () => {
    measure({ 'item-0': 500 })
    await nextTick()
    expect(wrapper.findAll('[data-key]')).toHaveLength(4)

    items.value = items.value.filter(item => item.id !== 'item-0')
    await nextTick()
    items.value = [{ id: 'item-0' }, ...items.value]
    await nextTick()

    expect(wrapper.findAll('[data-key]')).toHaveLength(8)
  })
})
