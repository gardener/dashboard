//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  watch,
  nextTick,
  toValue,
} from 'vue'
import { useTheme } from 'vuetify'
import vuetifyColors from 'vuetify/lib/util/colors'

import { isHtmlColorCode } from '@/utils'

import get from 'lodash/get'
import set from 'lodash/set'

function patchThemes (themes, customThemes) {
  for (const colorMode of ['light', 'dark']) {
    const themeColors = get(themes, [colorMode, 'colors'], {})
    const customThemeColors = get(customThemes, [colorMode], {})
    patchThemeColors(themeColors, customThemeColors)
  }
}

function patchThemeColors (themeColors, customThemeColors) {
  for (const [key, value] of Object.entries(customThemeColors)) {
    setThemeColor(themeColors, key, value)
  }
}

function setThemeColor (themeColors, key, value) {
  if (!(key in themeColors)) {
    return
  }
  const colorCode = get(vuetifyColors, value)
  if (colorCode) {
    set(themeColors, [key], colorCode)
  } else if (isHtmlColorCode(value)) {
    set(themeColors, [key], value)
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
      const themes = toValue(theme.themes) ?? {}
      patchThemes(themes, value)
      resolve()
    }, {
      immediate: true,
    })
  })
}
