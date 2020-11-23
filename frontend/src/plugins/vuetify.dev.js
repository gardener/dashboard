//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'

Vue.use(Vuetify)

export default new Vuetify({
  icons: {
    iconfont: 'mdi'
  },
  theme: {
    themes: {
      light: {
        primary: '#009F76',
        secondary: '#4d4d4d',
        accent: '#009F76',
        anchor: '#009e9e',
        actionButton: '#000000',
        error: '#ff3300',
        warning: '#ff8000'
      },
      dark: {
        primary: '#00cc99',
        secondary: '#1a1a1a',
        accent: '#00664d',
        anchor: '#00cccc',
        actionButton: '#FFFFFF',
        error: '#b71c1c',
        warning: '#b5691c'
      }
    },
    dark: true
  }
})
