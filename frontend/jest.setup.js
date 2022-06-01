//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import Vue from 'vue'
import Vuetify from 'vuetify'
import fetchMock from 'jest-fetch-mock'

Vue.use(Vuetify)

fetchMock.enableMocks()

document.createRange = jest.fn().mockImplementation(() => {
  const range = new Range()
  range.getBoundingClientRect = jest.fn()
  range.getClientRects = () => {
    return {
      item: () => null,
      length: 0,
      [Symbol.iterator]: jest.fn()
    }
  }
  return range
})

window.matchMedia = jest.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})

const globalConsole = global.console
global.console = {
  log (...args) {
    globalConsole.log(...args)
  },
  warn: jest.fn(),
  error: jest.fn()
}

// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = jest.fn().mockImplementation(cb => cb())
