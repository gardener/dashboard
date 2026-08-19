//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  vi,
  beforeEach,
} from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import * as fixtures from './__fixtures__'

const globalConsole = global.console
const globalDocument = global.document
const globalWindow = global.window

const fetchMock = createFetchMock(vi)
fetchMock.enableMocks()

vi.mock('lodash/sample', () => {
  const sample = vi.fn(collection => {
    if (!Array.isArray(collection)) {
      collection = Object.values(collection)
    }
    return collection[0]
  })
  return {
    default: sample,
  }
})

vi.mock('@/utils', async importOriginal => {
  const originalUtils = await importOriginal()
  const utils = {
    ...originalUtils,
    shortRandomString (length) {
      return 'm6kgstc1b0dinxqj8z5wu7l9f3pveary2ho4'.substring(0, length)
    },
  }
  return {
    ...utils,
  }
})

globalDocument.createRange = vi.fn(() => {
  const range = new Range()
  range.getBoundingClientRect = vi.fn()
  range.getClientRects = () => {
    return {
      item: () => null,
      length: 0,
      [Symbol.iterator]: vi.fn(),
    }
  }
  return range
})

globalWindow.matchMedia = vi.fn(query => {
  return {
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
})

function createCookieStoreFake () {
  const cookies = new Map()
  const changeListeners = new Set()

  function cookieName (name) {
    return typeof name === 'object' && name
      ? name.name
      : name
  }

  function dispatchChange (event) {
    for (const listener of [...changeListeners]) {
      listener(event)
    }
  }

  return {
    async get (name) {
      name = cookieName(name)
      if (!cookies.has(name)) {
        return null
      }
      return {
        name,
        value: cookies.get(name),
      }
    },
    async set (name, value) {
      if (typeof name === 'object' && name) {
        value = name.value
        name = name.name
      }
      cookies.set(name, value)
    },
    async delete (name) {
      name = cookieName(name)
      cookies.delete(name)
      dispatchChange(Object.assign(new Event('change'), {
        changed: [],
        deleted: [{ name }],
      }))
    },
    addEventListener (type, listener) {
      if (type === 'change') {
        changeListeners.add(listener)
      }
    },
    removeEventListener (type, listener) {
      if (type === 'change') {
        changeListeners.delete(listener)
      }
    },
    dispatchEvent (event) {
      if (event?.type === 'change') {
        dispatchChange(event)
        return true
      }
      return false
    },
    get listenerCount () {
      return changeListeners.size
    },
  }
}

beforeEach(() => {
  globalWindow.cookieStore = createCookieStoreFake()
})

globalWindow.cookieStore = createCookieStoreFake()

if (!globalWindow.navigator.locks) {
  Object.defineProperty(globalWindow.navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name, callback) => Promise.resolve().then(() => callback()),
    },
  })
}

vi.stubGlobal('console', {
  log (...args) {
    globalConsole.log(...args)
  },
  warn: vi.fn(),
  error: vi.fn(),
})

const ResizeObserverMock = vi.fn(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }
})

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
vi.stubGlobal('requestAnimationFrame', window.requestAnimationFrame)
vi.stubGlobal('visualViewport', window.visualViewport)
vi.stubGlobal('fixtures', fixtures)
vi.stubGlobal('document', globalDocument)
