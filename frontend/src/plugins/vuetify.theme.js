//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import colors from 'vuetify/lib/util/colors'

const theme = {
  themes: {
    light: {
      primary: '#009F76',
      anchor: '#439246',
      'main-background': colors.grey.darken3,
      'main-navigation-title': colors.shades.white,
      'toolbar-background': '#009F76',
      'toolbar-title': colors.shades.white,
      'action-button': '#439246'
    },
    dark: {
      primary: '#009F76',
      'main-background': colors.grey.darken3,
      toolbar: '#009F76',
      'toolbar-title': colors.shades.white,
      anchor: '#439246',
      'action-button': '#439246',
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
