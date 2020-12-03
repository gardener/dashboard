//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import colors from 'vuetify/lib/util/colors'

const theme = {
  themes: {
    light: {
      primary: colors.cyan.darken2,
      secondary: colors.grey.darken3,
      accent: colors.cyan.darken2,
      accentTitle: colors.grey.lighten4,
      anchor: colors.cyan.darken2,
      actionButton: colors.shades.black
    },
    dark: {
      primary: colors.cyan.darken2,
      secondary: colors.grey.darken4,
      accent: colors.cyan.darken4,
      accentTitle: colors.grey.lighten4,
      anchor: colors.cyan.darken2,
      actionButton: colors.grey.lighten4,
      error: colors.red.darken4,
      warning: colors.orange.darken4
    }
  },
  dark: false
}

export default theme
