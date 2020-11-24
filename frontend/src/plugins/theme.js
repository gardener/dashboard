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
      secondary: '#333333',
      accent: colors.cyan.darken2,
      anchor: colors.cyan.darken2,
      actionButton: colors.black
    },
    dark: {
      primary: '#00cc99',
      secondary: '#1a1a1a',
      accent: '#00664d',
      anchor: '#00cccc',
      actionButton: '#FFFFFF',
      error: '#b71c1c',
      warning: '#b5691c'
    }
  },
  dark: false
}

export default theme
