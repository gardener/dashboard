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

const light = {
  dark: false,
  colors: {
    anchor: '#0a7357',
    primary: '#0a7357',
    secondary: grey.darken3,
    unknown: '#424242',
    accent: orange.lighten5,
    error: red.darken2,
    info: '#0D47A1',
    success: '#2F651A',
    warning: orange.darken2,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#0a7357',
    'toolbar-title': shades.white,
    'action-button': grey.darken4,
    logout: '#880E4F',
    'chip-ready': '#0a7357',
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
    error: red.lighten1,
    info: '#27bbf5',
    success: green.base,
    warning: orange.darken4,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#0b8062',
    'toolbar-title': shades.white,
    'action-button': grey.lighten4,
    logout: red.lighten1,
    'chip-ready': '#60C0A0',
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
