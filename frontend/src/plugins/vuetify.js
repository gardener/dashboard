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
  blue,
  shades,
} from 'vuetify/util/colors'

import {
  getTonalColorName,
  TONAL_COLOR_NAMES,
} from '@/utils/themeColors'

function withTonalColors (colors) {
  const tonalColors = Object.fromEntries(Object.entries(colors)
    .filter(([name]) => TONAL_COLOR_NAMES.includes(name))
    .map(([name, value]) => [getTonalColorName(name), value]))
  return {
    ...colors,
    ...tonalColors,
  }
}

const light = {
  dark: false,
  colors: withTonalColors({
    anchor: '#0a6b51',
    primary: '#0a6b51',
    secondary: grey.darken3,
    unknown: grey.darken3,
    accent: orange.lighten5,
    error: red.darken2,
    info: blue.darken4,
    success: green.darken3,
    warning: orange.darken4,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#0a6b51',
    'toolbar-title': shades.white,
    'action-button': grey.darken4,
  }),
}

const dark = {
  dark: true,
  colors: withTonalColors({
    anchor: '#60C0A0',
    primary: '#60C0A0',
    secondary: grey.darken3,
    unknown: grey.lighten1,
    accent: grey.darken3,
    error: red.lighten1,
    info: '#27bbf5',
    success: green.lighten1,
    warning: orange.lighten1,
    'main-background': grey.darken3,
    'main-navigation-title': shades.white,
    'toolbar-background': '#0b8062',
    'toolbar-title': shades.white,
    'action-button': grey.lighten4,
  }),
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
  defaults: {
    VTooltip: {
      eager: false,
    },
  },
})
