//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import colors from 'vuetify/lib/util/colors'

const theme = {
  themes: {
    light: {
      primary: '#0b8062',
      anchor: '#0b8062',
      'main-background': colors.grey.darken3,
      'main-navigation-title': colors.shades.white,
      'toolbar-background': '#0b8062',
      'toolbar-title': colors.shades.white,
      'action-button': colors.grey.darken4
    },
    dark: {
      primary: '#0b8062',
      anchor: '#0b8062',
      'main-background': colors.grey.darken3,
      'main-navigation-title': colors.shades.white,
      'toolbar-background': '#0b8062',
      'toolbar-title': colors.shades.white,
      'action-button': colors.grey.lighten4,
      error: colors.red.darken4,
      warning: colors.orange.darken4
    }
  },
  dark: false,
  options: {
    customProperties: true,
    variations: true
  }
}

export default theme
