//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  watchEffect,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  blend,
  formatHex,
  formatRgb,
  modeLrgb,
  modeOklch,
  modeRgb,
  toGamut,
  useMode,
  wcagContrast,
} from 'culori/fn'

const toRgb = useMode(modeRgb)
useMode(modeLrgb)
const toOklch = useMode(modeOklch)
const toSrgbGamut = toGamut('rgb', 'oklch')

const WHITE = '#ffffff'
const BLACK = '#000000'

export const ERROR_CHIP_BACKGROUND_VAR = '--g-error-chip-background'
export const ERROR_CHIP_TEXT_VAR = '--g-error-chip-text'

export const WARNING_CHIP_TEXT_VAR = '--g-warning-chip-text'
export const WARNING_CHIP_BACKGROUND_VAR = '--g-warning-chip-background'
export const WARNING_CHIP_BACKGROUND_OPACITY_VAR = '--g-warning-chip-background-opacity'

/** Match Vuetify's default tonal chip opacity when calculating its visible background color. */
const TONAL_BACKGROUND_OPACITY = 0.12

function meetsContrast (background, textColor, targetContrast) {
  try {
    return wcagContrast(background, textColor) >= targetContrast
  } catch {
    return false
  }
}

function createChipColorResult (background, textColor, changedColor) {
  return {
    background,
    textColor,
    backgroundChanged: changedColor === 'background',
    textColorChanged: changedColor === 'text',
  }
}

function pickHigherContrastTextColor (background) {
  return wcagContrast(background, WHITE) >= wcagContrast(background, BLACK)
    ? WHITE
    : BLACK
}

function createTonalBackgroundColor (foreground, background, opacity) {
  try {
    const foregroundRgb = toRgb(foreground)
    if (!foregroundRgb) {
      return undefined
    }
    return formatHex(blend([
      background,
      { ...foregroundRgb, alpha: opacity },
    ]))
  } catch {
    return undefined
  }
}

/**
 * Adjusts OKLCH lightness of `originalColor` toward `targetLightness` until contrast
 * with `textColor` meets `targetContrast`. Returns the closest passing hex color, or null.
 *
 *
 * @param {object} originalColor Culori OKLCH color object (not a hex string)
 * @param {string} textColor Hex color used as the contrast partner (e.g. `#ffffff`)
 * @param {number} targetLightness Unitless OKLCH lightness (0 = black, 1 = white)
 * @param {number} targetContrast Minimum WCAG contrast ratio (4.5 = AA, 7 = AAA)
 * @returns {string|null} Hex color (e.g. `#831723`), or null
 */
function adjustLightnessForContrast (originalColor, textColor, targetLightness, targetContrast) {
  let failing = 0
  let passing = 1
  let result = null

  for (let i = 0; i < 30; i++) {
    const position = (failing + passing) / 2
    const lightness = originalColor.l + (targetLightness - originalColor.l) * position
    const candidateHex = formatHex(toSrgbGamut({ ...originalColor, l: lightness }))

    if (candidateHex && meetsContrast(candidateHex, textColor, targetContrast)) {
      result = candidateHex
      passing = position
    } else {
      failing = position
    }
  }

  return result
}

/**
 * Chooses readable colors for Vuetify flat or tonal chips.
 *
 * Flat chips prefer white text and adjust their background when needed. Tonal
 * chips preserve the default colors when possible, then change either the
 * background or the text color.
 *
 * @param {string} color Flat background or tonal theme color
 * @param {object} [options]
 * @param {'flat'|'tonal'} [options.variant='flat']
 * @param {string} [options.surface] Surface behind a tonal chip
 * @param {number} [options.targetContrast=4.5] Minimum WCAG contrast ratio
 * @returns {{
 *   background: string,
 *   textColor: string,
 *   backgroundChanged: boolean,
 *   textColorChanged: boolean
 * }|undefined}
 */
export function pickAccessibleChipColors (color, {
  variant = 'flat',
  surface,
  targetContrast = 4.5,
} = {}) {
  if (!color || (variant === 'tonal' && !surface)) {
    return undefined
  }

  const original = toOklch(color)
  if (!original || typeof original.l !== 'number') {
    return variant === 'tonal' ? undefined : createChipColorResult(color, WHITE)
  }

  let background = color
  let textColor = WHITE
  let targetBackgroundLightness = 0

  if (variant === 'tonal') {
    const surfaceColor = toOklch(surface)
    if (!surfaceColor || typeof surfaceColor.l !== 'number') {
      return undefined
    }

    background = createTonalBackgroundColor(color, surface, TONAL_BACKGROUND_OPACITY)
    if (!background) {
      return undefined
    }
    textColor = color
    targetBackgroundLightness = surfaceColor.l
  }

  if (meetsContrast(background, textColor, targetContrast)) {
    return createChipColorResult(background, textColor)
  }

  const adjustedBackground = adjustLightnessForContrast(
    original,
    textColor,
    targetBackgroundLightness,
    targetContrast,
  )
  if (adjustedBackground) {
    return createChipColorResult(adjustedBackground, textColor, 'background')
  }

  if (variant === 'tonal') {
    const targetTextColor = pickHigherContrastTextColor(background)
    const targetTextLightness = targetTextColor === WHITE ? 1 : 0
    const adjustedTextColor = adjustLightnessForContrast(
      original,
      background,
      targetTextLightness,
      targetContrast,
    )
    if (adjustedTextColor) {
      return createChipColorResult(background, adjustedTextColor, 'text')
    }
  }

  return createChipColorResult(background, textColor)
}

/** Format a color for Vuetify theme CSS variables (`rgb(var(--v-theme-…))`).
 * Expects the color as hex string, e.g. `#ff0000`.
 */
export function colorToVuetifyRgb (color) {
  try {
    const formattedColor = formatRgb(color)
    if (!formattedColor?.startsWith('rgb(')) {
      return undefined
    }
    return formattedColor.slice(4, -1)
  } catch {
    return undefined
  }
}

function setCssVariable (name, value) {
  const root = document.documentElement
  if (value === undefined) {
    root.style.removeProperty(name)
    return
  }
  root.style.setProperty(name, value)
}

function applyAccessibleChipCssVars (vars) {
  setCssVariable(ERROR_CHIP_BACKGROUND_VAR, vars?.error?.backgroundRgb)
  setCssVariable(ERROR_CHIP_TEXT_VAR, vars?.error?.textRgb)
  setCssVariable(WARNING_CHIP_BACKGROUND_VAR, vars?.warning?.backgroundRgb)
  setCssVariable(WARNING_CHIP_BACKGROUND_OPACITY_VAR, vars?.warning?.backgroundOpacity)
  setCssVariable(WARNING_CHIP_TEXT_VAR, vars?.warning?.textRgb)
}

function createErrorChipCssVars (themeValue) {
  const accessible = pickAccessibleChipColors(themeValue?.colors?.error)
  if (!accessible) {
    return undefined
  }

  const backgroundRgb = colorToVuetifyRgb(accessible.background)
  const textRgb = colorToVuetifyRgb(accessible.textColor)
  if (!backgroundRgb || !textRgb) {
    return undefined
  }

  return { backgroundRgb, textRgb }
}

function createWarningChipCssVars (themeValue) {
  const warningColor = themeValue?.colors?.warning
  if (!warningColor) {
    return undefined
  }

  const accessible = pickAccessibleChipColors(warningColor, {
    variant: 'tonal',
    surface: themeValue.colors.surface,
  })
  if (!accessible) {
    return undefined
  }

  const vars = {}
  if (accessible.backgroundChanged) {
    const backgroundRgb = colorToVuetifyRgb(accessible.background)
    if (!backgroundRgb) {
      return undefined
    }
    vars.backgroundRgb = backgroundRgb
    vars.backgroundOpacity = '1'
  } else if (accessible.textColorChanged) {
    const textRgb = colorToVuetifyRgb(accessible.textColor)
    if (!textRgb) {
      return undefined
    }
    vars.textRgb = textRgb
  }
  return vars
}

function createChipCssVars (theme) {
  return computed(() => ({
    error: createErrorChipCssVars(theme.current.value),
    warning: createWarningChipCssVars(theme.current.value),
  }))
}

/**
 * Ensures error and tonal warning chips remain readable without changing the related
 * global theme colors by exposing accessible colors as document CSS custom properties.
 */
export function useAccessibleChipColors () {
  const chipCssVars = createChipCssVars(useTheme())
  watchEffect(() => {
    applyAccessibleChipCssVars(chipCssVars.value)
  })

  return { chipCssVars }
}
