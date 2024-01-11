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

export const useCustomColors = (customThemes, theme = useTheme()) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unwatch()
      reject(new Error('Setting custom colors timed out'))
    }, 3000)
    const unwatch = watch(customThemes, value => {
      if (value) {
        clearTimeout(timeoutId)
        nextTick(() => unwatch())
        for (const colorMode of ['light', 'dark']) {
          const vuetifyThemeColors = toValue(theme.themes)?.[colorMode]?.colors ?? {}
          const customThemeColors = value[colorMode] ?? {}
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
        resolve()
      }
    }, {
      immediate: true,
    })
  })
}
