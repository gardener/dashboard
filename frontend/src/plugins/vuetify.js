//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Material Design Icons Webfont
import '@mdi/font/css/materialdesignicons.css'

// Styles
import 'unfonts.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import * as labs from 'vuetify/labs/components'
import colors from 'vuetify/lib/util/colors'

const gardenerGreen = '#0b8062'

const light = {
  dark: false,
  colors: {
    anchor: gardenerGreen,
    primary: gardenerGreen,
    secondary: colors.grey.darken3,
    unknown: colors.grey.darken1,
    accent: colors.blue.accent1,
    error: colors.red.accent2,
    info: colors.blue.base,
    success: colors.green.base,
    warning: colors.orange.darken1,
    'main-background': colors.grey.darken3,
    'main-navigation-title': colors.shades.white,
    'toolbar-background': gardenerGreen,
    'toolbar-title': colors.shades.white,
    'action-button': colors.grey.darken4,
  },
}

const dark = {
  dark: true,
  colors: {
    anchor: gardenerGreen,
    primary: gardenerGreen,
    secondary: colors.grey.darken3,
    unknown: colors.grey.darken1,
    accent: colors.pink.accent2,
    error: colors.red.darken4,
    info: colors.blue.base,
    success: colors.green.base,
    warning: colors.orange.darken4,
    'main-background': colors.grey.darken3,
    'main-navigation-title': colors.shades.white,
    'toolbar-background': gardenerGreen,
    'toolbar-title': colors.shades.white,
    'action-button': colors.grey.lighten4,
  },
}

const variations = {
  colors: [
    'primary',
    'secondary',
    'error',
    'info',
    'success',
    'warning',
    'main-background',
    'toolbar-background',
  ],
  lighten: 1,
  darken: 2,
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
  components: {
    ...labs,
  },
})
