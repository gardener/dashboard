//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import colors from 'vuetify/lib/util/colors'

const theme = {
  themes: {
    light: {
      primary: '#010869',
      anchor: '#010869',
      'main-background': '#efefec',
      'main-navigation-title': '#172b4d',
      'toolbar-background': '#010869',
      'toolbar-title': '#efefec',
      'action-button': '#818181'
    },
    dark: {
      primary: '#818181',
      anchor: '#efefec',
      'main-background': '#818181',
      'main-navigation-title': '#e6e6e6',
      'toolbar-background': '#010869',
      'toolbar-title': '#b5b5b5',
      'action-button': '#a1ecff',
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
