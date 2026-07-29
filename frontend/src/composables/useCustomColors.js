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
import vuetifyColors from 'vuetify/util/colors'

import { isHtmlColorCode } from '@/utils'
import { pickAccessibleTonalColor } from '@/utils/accessibleColors'
import {
  getTonalColorName,
  TONAL_COLOR_NAMES,
} from '@/utils/themeColors'

import get from 'lodash/get'
import set from 'lodash/set'

const tonalColorNames = new Set(TONAL_COLOR_NAMES.map(getTonalColorName))

function patchThemes (themes, customThemes) {
  for (const colorMode of ['light', 'dark']) {
    const themeColors = get(themes, [colorMode, 'colors'], {})
    const customThemeColors = get(customThemes, [colorMode], {})
    patchThemeColors(themeColors, customThemeColors)
    setTonalThemeColors(themeColors)
  }
}

function patchThemeColors (themeColors, customThemeColors) {
  for (const [key, value] of Object.entries(customThemeColors)) {
    if (tonalColorNames.has(key)) {
      continue
    }
    setThemeColor(themeColors, key, value)
  }
}

function setThemeColor (themeColors, key, value) {
  if (!(key in themeColors)) {
    return
  }
  const colorCode = resolveThemeColor(value)
  if (colorCode) {
    set(themeColors, [key], colorCode)
  }
}

function resolveThemeColor (value) {
  const colorCode = get(vuetifyColors, value)
  if (colorCode) {
    return colorCode
  }
  if (isHtmlColorCode(value)) {
    return value
  }
}

export function setTonalThemeColors (themeColors) {
  const surface = get(themeColors, ['surface'])

  for (const colorName of TONAL_COLOR_NAMES) {
    const tonalColorName = getTonalColorName(colorName)
    const baseColor = get(themeColors, [colorName])

    set(
      themeColors,
      [tonalColorName],
      pickAccessibleTonalColor(baseColor, surface) ?? baseColor,
    )
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
