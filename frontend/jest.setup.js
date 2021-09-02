//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import Vue from 'vue'
import Vuetify from 'vuetify'
import fetchMock from 'jest-fetch-mock'

Vue.use(Vuetify)

fetchMock.enableMocks()

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
