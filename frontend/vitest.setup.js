//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

import createFetchMock from 'vitest-fetch-mock'

import * as fixtures from './__fixtures__'

const globalConsole = global.console
const globalDocument = global.document
const globalWindow = global.window

const fetchMock = createFetchMock(vi)
fetchMock.enableMocks()

globalDocument.createRange = vi.fn().mockImplementation(() => {
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

globalWindow.matchMedia = vi.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
})

vi.stubGlobal('console', {
  log (...args) {
    globalConsole.log(...args)
  },
  warn: vi.fn(),
  error: vi.fn(),
})

const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
vi.stubGlobal('requestAnimationFrame', window.requestAnimationFrame)
vi.stubGlobal('fixtures', fixtures)
