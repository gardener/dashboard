//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  watch,
  nextTick,
} from 'vue'
import { useTheme } from 'vuetify'
import vuetifyColors from 'vuetify/lib/util/colors'
import { toValue } from '@vueuse/core'

import { isHtmlColorCode } from '@/utils'

import { get } from '@/lodash'

function patchVuetifyThemeColors (vuetifyThemes = {}, customThemes) {
  for (const colorMode of ['light', 'dark']) {
    const vuetifyThemeColors = vuetifyThemes[colorMode]?.colors ?? {}
    const customThemeColors = customThemes[colorMode] ?? {}
    for (const [key, value] of Object.entries(customThemeColors)) {
      if (key in vuetifyThemeColors) {
        const colorCode = get(vuetifyColors, value)
        if (colorCode) {
          vuetifyThemeColors[key] = colorCode
        } else if (isHtmlColorCode(value)) {
          vuetifyThemeColors[key] = value
        }
      }
    }
  }
}

export const useCustomColors = (customThemes, theme = useTheme()) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unwatch()
      reject(new Error('Setting custom colors timed out'))
    }, 3000)
    const unwatch = watch(customThemes, value => {
      if (!value) {
        return
      }
      clearTimeout(timeoutId)
      nextTick(() => unwatch())
      patchVuetifyThemeColors(toValue(theme.themes), value)
      resolve()
    }, {
      immediate: true,
    })
  })
}
