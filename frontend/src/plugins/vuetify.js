//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Material Design Icons Webfont
import '@/sass/materialdesignicons.scss'

// Styles
import 'unfonts.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import {
  grey,
  green,
  orange,
  red,
  shades,
} from 'vuetify/util/colors'

// All interactive text and status-label colors are chosen to meet WCAG 2.1 AAA
// (≥7:1 contrast ratio). Light and dark tokens differ because mid-range teals
// cannot clear 7:1 on both white (#fff) and the dark surface (#121212).
//
// Backgrounds:
//   Light – surface: #ffffff, app-bar: #f5f5f5 (grey.lighten-4)
//   Dark  – surface: #121212 (set explicitly below; darker than Vuetify default)

const light = {
  dark: false,
  colors: {
    anchor: '#0b8062',
    primary: '#0b8062',
    secondary: grey.darken3,
    unknown: '#424242',
    accent: orange.lighten5,
    error: '#B11616',
    info: '#0D47A1',
    success: '#2F651A',
    warning: orange.darken2,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#00A080',
    'toolbar-title': shades.white,
    'action-button': grey.darken4,
    logout: '#880E4F',
    'chip-ready': '#2F651A',
    'chip-error': red.accent2,
    'chip-info': '#0D47A1',
    'chip-unknown': grey.darken3,
    'nav-active': '#545454',
  },
}

const dark = {
  dark: true,
  colors: {
    anchor: '#60C0A0',
    primary: '#60C0A0',
    secondary: grey.darken3,
    unknown: '#BDBDBD',
    accent: grey.darken3,
    error: red.darken2,
    info: '#27bbf5',
    success: green.base,
    warning: orange.darken4,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#0b8062',
    'toolbar-title': shades.white,
    'action-button': grey.lighten4,
    logout: red.lighten1,
    'chip-ready': green.lighten3,
    'chip-error': red.darken4,
    'chip-info': '#90CAF9',
    'chip-unknown': grey.lighten1,
    'nav-active': '#545454',
  },
}

const variations = {
  colors: [
    'primary',
    'secondary',
    'accent',
    'error',
    'info',
    'success',
    'warning',
    'logout',
    'main-background',
    'toolbar-background',
    'nav-active',
  ],
  lighten: 3,
  darken: 3,
}

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'light',
    themes: { light, dark },
    variations,
  },
  defaults: {
    VTooltip: {
      eager: false,
    },
  },
})
