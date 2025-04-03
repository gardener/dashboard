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
  red,
  blue,
  green,
  shades,
} from 'vuetify/lib/util/colors'

const gardenerGreen = '#0b8062'

const light = {
  dark: false,
  colors: {
    anchor: gardenerGreen,
    primary: gardenerGreen,
    secondary: grey.darken3,
    unknown: grey.darken1,
    accent: orange.lighten5,
    error: red.accent2,
    info: blue.base,
    success: green.base,
    warning: orange.darken1,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': gardenerGreen,
    'toolbar-title': shades.white,
    'action-button': grey.darken4,
  },
}

const dark = {
  dark: true,
  colors: {
    anchor: gardenerGreen,
    primary: gardenerGreen,
    secondary: grey.darken3,
    unknown: grey.darken1,
    accent: grey.darken3,
    error: red.darken4,
    info: blue.base,
    success: green.base,
    warning: orange.darken4,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': gardenerGreen,
    'toolbar-title': shades.white,
    'action-button': grey.lighten4,
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
})
