//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  nextTick,
  reactive,
  ref,
} from 'vue'
import {
  flushPromises,
  mount,
} from '@vue/test-utils'

import { useItemPlaceholder } from '@/composables/useItemPlaceholder'

let beforeRouteUpdateHandler

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: handler => {
    beforeRouteUpdateHandler = handler
  },
}))

function createDeferred () {
  let resolve
  const promise = new Promise(_resolve => {
    resolve = _resolve
  })
  return {
    promise,
    resolve,
  }
}

describe('composables', () => {
  describe('useItemPlaceholder', () => {
    beforeEach(() => {
      beforeRouteUpdateHandler = undefined
    })

    it('should keep rendering the router-view when switching between sibling routes with identical params', async () => {
      const item = ref(true)
      const route = reactive({
        name: 'NewShoot',
        params: {
          namespace: 'garden-test',
        },
        path: '/namespace/garden-test/shoots/+',
      })
      const deferredLoad = createDeferred()
      const load = vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockImplementationOnce(() => deferredLoad.promise)

      let state
      const TestComponent = defineComponent({
        setup () {
          state = useItemPlaceholder({
            route,
            item,
            load,
            errorComponent: 'error-view',
            loadingComponent: 'loading-view',
          })

          return () => null
        },
      })

      const wrapper = mount(TestComponent)
      await flushPromises()

      expect(beforeRouteUpdateHandler).toEqual(expect.any(Function))
      expect(load).toHaveBeenCalledTimes(1)
      expect(state.component.value).toBe('router-view')

      const to = {
        name: 'NewShootEditor',
        params: {
          namespace: 'garden-test',
        },
        path: '/namespace/garden-test/shoots/+/yaml',
      }

      const navigation = beforeRouteUpdateHandler(to)
      await nextTick()

      expect(state.component.value).toBe('router-view')

      route.name = to.name
      route.path = to.path
      deferredLoad.resolve()

      await navigation
      await flushPromises()

      expect(state.component.value).toBe('router-view')

      wrapper.unmount()
    })
  })
})
