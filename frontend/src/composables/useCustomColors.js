//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
import { wcagContrast } from 'culori/fn'

import { isHtmlColorCode } from '@/utils'
import {
  pickAccessibleTextColor,
  pickAccessibleTonalColor,
} from '@/utils/accessibleColors'
import {
  getFlatColorName,
  getOnFlatColorName,
  getTonalColorName,
  isDerivedColorName,
  SEMANTIC_COLOR_NAMES,
} from '@/utils/themeColors'

import get from 'lodash/get'
import set from 'lodash/set'

const WHITE = '#ffffff'

function resolveThemeColor (value) {
  const colorCode = get(vuetifyColors, value)
  if (colorCode) {
    return colorCode
  }
  if (isHtmlColorCode(value)) {
    return value
  }
}

function patchThemeColors (themeColors, customThemeColors) {
  const customDerivedColors = {}

  for (const [key, value] of Object.entries(customThemeColors)) {
    const colorCode = resolveThemeColor(value)
    if (!colorCode) {
      continue
    }

    if (isDerivedColorName(key)) {
      set(customDerivedColors, [key], colorCode)
      continue
    }

    if (key in themeColors) {
      set(themeColors, [key], colorCode)
    }
  }

  return customDerivedColors
}

function setTonalThemeColors (themeColors, customDerivedColors = {}) {
  const surfaceColor = get(themeColors, ['surface'])

  for (const colorName of SEMANTIC_COLOR_NAMES) {
    const tonalColorName = getTonalColorName(colorName)
    const baseColor = get(themeColors, [colorName])
    const customTonalColor = get(customDerivedColors, [tonalColorName])

    if (customTonalColor) {
      set(themeColors, [tonalColorName], customTonalColor)
      continue
    }

    set(
      themeColors,
      [tonalColorName],
      pickAccessibleTonalColor(baseColor, surfaceColor) ?? baseColor,
    )
  }
}

function setFlatThemeColors (themeColors, customDerivedColors = {}) {
  for (const colorName of SEMANTIC_COLOR_NAMES) {
    const flatColorName = getFlatColorName(colorName)
    const onFlatColorName = getOnFlatColorName(colorName)
    const baseColor = get(themeColors, [colorName])
    const customFlatColor = get(customDerivedColors, [flatColorName])
    const customOnFlatColor = get(customDerivedColors, [onFlatColorName])

    try {
      if (
        customFlatColor &&
        customOnFlatColor &&
        wcagContrast(customFlatColor, customOnFlatColor) >= 4.5
      ) {
        set(themeColors, [flatColorName], customFlatColor)
        set(themeColors, [onFlatColorName], customOnFlatColor)
        continue
      }
    } catch {
      // Fall through and recompute from the semantic base color.
    }

    const flatColor = customFlatColor ?? baseColor
    set(themeColors, [flatColorName], flatColor)
    set(
      themeColors,
      [onFlatColorName],
      pickAccessibleTextColor(flatColor) ?? WHITE,
    )
  }
}

function patchThemes (themes, customThemes) {
  for (const colorMode of ['light', 'dark']) {
    const themeColors = get(themes, [colorMode, 'colors'], {})
    const customThemeColors = get(customThemes, [colorMode], {})
    const customDerivedColors = patchThemeColors(themeColors, customThemeColors)
    setTonalThemeColors(themeColors, customDerivedColors)
    setFlatThemeColors(themeColors, customDerivedColors)
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
