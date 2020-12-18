//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import colors from 'vuetify/lib/util/colors'

const theme = {
  themes: {
    light: {
      primary: colors.lightBlue.base,
      secondary: colors.grey.darken3,
      accent: colors.lightBlue.darken2,
      accentTitle: colors.lightBlue.lighten4,
      anchor: colors.lightBlue.accent2,
      actionButton: colors.lightBlue.darken4
    },
    dark: {
      primary: colors.lightBlue.base,
      secondary: colors.grey.darken4,
      accent: colors.lightBlue.darken4,
      accentTitle: colors.lightBlue.lighten2,
      anchor: colors.lightBlue.accent2,
      actionButton: colors.lightBlue.lighten2,
      error: colors.red.darken4,
      warning: colors.orange.darken4
    }
  },
  dark: false
}

export default theme
