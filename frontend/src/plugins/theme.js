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
      accent: colors.lightBlue.darken1,
      accentTitle: colors.shades.white,
      anchor: colors.lightBlue.base,
      actionButton: colors.lightBlue.darken1
    },
    dark: {
      primary: colors.lightBlue.base,
      secondary: colors.grey.darken3,
      accent: colors.lightBlue.darken2,
      accentTitle: colors.shades.white,
      anchor: colors.lightBlue.base,
      actionButton: colors.lightBlue.base,
      error: colors.red.darken4,
      warning: colors.orange.darken4
    }
  },
  dark: false
}

export default theme
