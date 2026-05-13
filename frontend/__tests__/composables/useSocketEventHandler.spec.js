//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { flushPromises } from '@vue/test-utils'
import {
  computed,
  nextTick,
  reactive,
  ref,
} from 'vue'

import {
  createListOperator,
  useSocketEventHandler,
} from '@/composables/useSocketEventHandler'

function createLogger () {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}

function createListStore (id, initialList = null) {
  const state = reactive({
    list: initialList,
  })
  const isInitial = computed(() => state.list === null)
  const store = {
    $id: id,
    get isInitial () {
      return isInitial.value
    },
    $patch (fn) {
      fn(state)
    },
  }

  return {
    state,
    store,
  }
}

function createDeferred () {
  let resolvePromise
  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}

async function flushEvents () {
  await nextTick()
  await flushPromises()
}

describe('composables', () => {
  describe('useSocketEventHandler', () => {
    let logger
    let socketStore
    let visibility

    beforeEach(() => {
      logger = createLogger()
      socketStore = {
        synchronize: vi.fn(),
      }
      visibility = ref('visible')
    })

    it('defers socket events until the store is initialized', async () => {
      const { state, store } = createListStore('seed')
      const item = {
        kind: 'Seed',
        metadata: {
          uid: 'uid-1',
        },
      }
      socketStore.synchronize.mockResolvedValue([item])
      const socketEventHandler = useSocketEventHandler(() => store, {
        logger,
        socketStore,
        visibility,
      })

      socketEventHandler.start(0)
      socketEventHandler.listener({
        type: 'MODIFIED',
        uid: 'uid-1',
      })
      await flushEvents()

      expect(socketStore.synchronize).not.toBeCalled()
      expect(state.list).toBeNull()

      state.list = []
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(1)
      expect(socketStore.synchronize).toBeCalledWith('seeds', ['uid-1'])
      expect(state.list).toEqual([item])
    })

    it('does not apply synchronized events when the store was reset before the response arrives', async () => {
      const { state, store } = createListStore('seed', [])
      const item = {
        kind: 'Seed',
        metadata: {
          uid: 'uid-1',
        },
      }
      const synchronize = createDeferred()
      socketStore.synchronize
        .mockReturnValueOnce(synchronize.promise)
        .mockResolvedValueOnce([item])
      const socketEventHandler = useSocketEventHandler(() => store, {
        logger,
        socketStore,
        visibility,
      })

      socketEventHandler.start(0)
      socketEventHandler.listener({
        type: 'MODIFIED',
        uid: 'uid-1',
      })
      await flushEvents()

      state.list = null
      synchronize.resolve([item])
      await flushEvents()

      expect(state.list).toBeNull()
      expect(logger.error).not.toBeCalled()

      state.list = []
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(2)
      expect(state.list).toEqual([item])
    })

    it('requeues synchronized events when the store is reset while applying them', async () => {
      const { state, store } = createListStore('seed', [])
      const item = {
        kind: 'Seed',
        metadata: {
          uid: 'uid-1',
        },
      }
      const patch = store.$patch
      let resetBeforePatch = true
      store.$patch = fn => {
        if (resetBeforePatch) {
          resetBeforePatch = false
          state.list = null
        }
        patch(fn)
      }
      socketStore.synchronize.mockResolvedValue([item])
      const socketEventHandler = useSocketEventHandler(() => store, {
        logger,
        socketStore,
        visibility,
      })

      socketEventHandler.start(0)
      socketEventHandler.listener({
        type: 'MODIFIED',
        uid: 'uid-1',
      })
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(1)
      expect(state.list).toBeNull()
      expect(logger.debug).toBeCalledWith(
        'Skipped synchronization of %s: store not yet initialized',
        'seeds',
      )
      expect(logger.error).not.toBeCalled()

      state.list = []
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(2)
      expect(state.list).toEqual([item])
    })

    it('synchronizes socket events immediately when the store is initialized', async () => {
      const { state, store } = createListStore('project', [])
      const item = {
        kind: 'Project',
        metadata: {
          uid: 'uid-1',
        },
      }
      socketStore.synchronize.mockResolvedValue([item])
      const socketEventHandler = useSocketEventHandler(() => store, {
        logger,
        socketStore,
        visibility,
      })

      socketEventHandler.start(0)
      socketEventHandler.listener({
        type: 'ADDED',
        uid: 'uid-1',
      })
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(1)
      expect(socketStore.synchronize).toBeCalledWith('projects', ['uid-1'])
      expect(state.list).toEqual([item])
    })

    it('does not retry operator failures as transient synchronization failures', async () => {
      const { store } = createListStore('seed', [])
      const item = {
        kind: 'Seed',
        metadata: {
          uid: 'uid-1',
        },
      }
      socketStore.synchronize.mockResolvedValue([item])
      const socketEventHandler = useSocketEventHandler(() => store, {
        logger,
        socketStore,
        visibility,
        createOperator () {
          return {
            delete: vi.fn(),
            set () {
              throw new Error('operator failed')
            },
          }
        },
      })

      socketEventHandler.start(0)
      socketEventHandler.listener({
        type: 'MODIFIED',
        uid: 'uid-1',
      })
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(1)
      expect(logger.error).toBeCalledWith(
        'Failed to apply synchronized %s: %s',
        'seeds',
        'operator failed',
      )

      visibility.value = 'hidden'
      await flushEvents()
      visibility.value = 'visible'
      await flushEvents()

      expect(socketStore.synchronize).toBeCalledTimes(1)
    })

    it('requires an initialized array list for list operators', () => {
      expect(() => createListOperator(null)).toThrow('Argument `list` must be an array')
    })
  })
})
