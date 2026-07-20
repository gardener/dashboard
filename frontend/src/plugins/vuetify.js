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
  orange,
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
    anchor: '#005F4E',
    primary: '#005F4E',
    secondary: grey.darken3,
    unknown: '#424242',
    accent: orange.lighten5,
    error: '#B11616',
    info: '#0D47A1',
    success: '#2F651A',
    warning: '#B40C00',
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#005F4E',
    'toolbar-title': shades.white,
    'action-button': grey.darken4,
    logout: '#880E4F',
    'chip-error': '#FF6B6B',
  },
}

const dark = {
  dark: true,
  colors: {
    surface: '#121212',
    background: '#0D0D0D',
    anchor: '#4DB6AC',
    primary: '#4DB6AC',
    secondary: grey.darken3,
    unknown: '#BDBDBD',
    accent: grey.darken3,
    error: '#FF7070',
    info: '#90CAF9',
    success: '#8BC34A',
    warning: '#FF8C00',
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#005F4E',
    'toolbar-title': shades.white,
    'action-button': grey.lighten4,
    logout: '#F8BBD0',
    'chip-error': '#FF7070',
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
