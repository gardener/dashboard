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
      secondary: colors.grey.darken3,
      accent: '#009F76',
      accentTitle: colors.shades.white,
      anchor: '#439246',
      actionButton: '#439246'
    },
    dark: {
      primary: '#009F76',
      secondary: colors.grey.darken3,
      accent: '#009F76',
      accentTitle: colors.shades.white,
      anchor: '#439246',
      actionButton: '#439246',
      error: colors.red.darken4,
      warning: colors.orange.darken4
    }
  },
  dark: false
}

export default theme
