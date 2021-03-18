//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import store from '@/store'
import createRouter from '@/router'

Vue.config.productionTip = false

const App = Vue.extend({
  name: 'app',
  created () {
    // provide the keyboard events for dialogs. Dialogs can't catch keyboard events
    // if any input element of the dialog didn't have the focus.
    window.addEventListener('keyup', ({ keyCode }) => {
      if (keyCode === 27) {
        this.$bus.$emit('esc-pressed')
      }
    })

    const darkMode = this.$localStorage.getItem('global/setting-dark-mode') || 2
    this.$store.commit('SET_DARK_MODE', darkMode)

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkMediaQuery.addEventListener('change', (e) => {
      this.$store.commit('SET_DARK_MODE')
    })
  },
  render (createElement) {
    return createElement('router-view')
  }
})

function createApp (vuetify) {
  Object.defineProperty(Vue, 'vuetify', { value: vuetify })
  return new Vue({
    vuetify,
    store,
    router: createRouter(store),
    render (createElement) {
      return createElement(App)
    }
  })
}

export { App, createApp }

export default createApp
