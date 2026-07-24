//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  effectScope,
  watchEffect,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  converter,
  formatHex,
  toGamut,
  wcagContrast,
} from 'culori'

const toOklch = converter('oklch')
const toSrgbGamut = toGamut('rgb', 'oklch')

const WHITE = '#ffffff'
const BLACK = '#000000'

export const ERROR_CHIP_CLASS = 'g-error-chip'
export const ERROR_CHIP_BACKGROUND_VAR = '--g-error-chip-background'
export const ERROR_CHIP_TEXT_VAR = '--g-error-chip-text'

export const WARNING_CHIP_CLASS = 'g-warning-chip'
export const WARNING_CHIP_TEXT_VAR = '--g-warning-chip-text'
export const WARNING_CHIP_BACKGROUND_VAR = '--g-warning-chip-background'
export const WARNING_CHIP_BACKGROUND_OPACITY_VAR = '--g-warning-chip-background-opacity'

/** Vuetify tonal chips tint the background at `--v-activated-opacity` (default 0.12). */
const TONAL_BACKGROUND_OPACITY = 0.12

const LIGHT_SURFACE = '#ffffff'
const DARK_SURFACE = '#121212'

let sharedErrorChipCssVars
let sharedErrorChipScope
let sharedWarningChipCssVars
let sharedWarningChipScope

function meetsContrast (background, textColor, targetContrast) {
  try {
    return wcagContrast(background, textColor) >= targetContrast
  } catch {
    return false
  }
}

/**
 * Alpha-blend `foreground` over `background` at unitless `opacity` (0–1).
 * Returns a hex string, or undefined when either color cannot be parsed.
 */
function blendOver (foreground, background, opacity) {
  try {
    const fg = toSrgbGamut(toOklch(foreground))
    const bg = toSrgbGamut(toOklch(background))
    if (!fg || !bg || typeof fg.r !== 'number' || typeof bg.r !== 'number') {
      return undefined
    }
    return formatHex({
      mode: 'rgb',
      r: fg.r * opacity + bg.r * (1 - opacity),
      g: fg.g * opacity + bg.g * (1 - opacity),
      b: fg.b * opacity + bg.b * (1 - opacity),
    })
  } catch {
    return undefined
  }
}

/**
 * Adjusts OKLCH lightness of `originalColor` toward `targetLightness` until contrast
 * with `textColor` meets `targetContrast`. Returns the closest passing hex color, or null.
 *
 * Contrast is checked on the hex-quantized candidate so 8-bit rounding cannot drop a
 * barely-passing float color below the threshold.
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
 * Chooses a readable text/background pair for a flat-style chip.
 * Prefers white text (darkening the background if needed) so flat chips stay
 * visually “filled”.
 * Uses black text only when white cannot meet the WCAG AA contrast standard.
 *
 * @returns {{ background: string, textColor: string }|undefined}
 *   `background` and `textColor` are hex strings when colors are valid.
 */
export function pickAccessibleChipColors (background, targetContrast = 4.5) {
  if (!background) {
    return undefined
  }

  if (meetsContrast(background, WHITE, targetContrast)) {
    return { background, textColor: WHITE }
  }

  const original = toOklch(background)
  // For unparseable colors: keep the input and prefer white text
  if (!original || typeof original.l !== 'number') {
    return { background, textColor: WHITE }
  }

  const backgroundForWhiteText = adjustLightnessForContrast(original, WHITE, 0, targetContrast)
  if (backgroundForWhiteText) {
    return { background: backgroundForWhiteText, textColor: WHITE }
  }

  if (meetsContrast(background, BLACK, targetContrast)) {
    return { background, textColor: BLACK }
  }

  const backgroundForBlackText = adjustLightnessForContrast(original, BLACK, 1, targetContrast)
  if (backgroundForBlackText) {
    return { background: backgroundForBlackText, textColor: BLACK }
  }

  try {
    const textColor = wcagContrast(background, WHITE) >= wcagContrast(background, BLACK)
      ? WHITE
      : BLACK
    return { background, textColor }
  } catch {
    return { background, textColor: WHITE }
  }
}

/**
 * Chooses colors to fix contrast for a Vuetify tonal chip
 *
 * Changes either the background or the text color — never both.
 * - If default tonal contrast already passes, don't change anything.
 * - Otherwise try to find the closest suitable background color that meets the contrast requirement.
 * - If no suitable background color is found, darken/lighten the text color to meet the contrast requirement.
 *
 */
export function pickAccessibleTonalChipColors (color, surface, targetContrast = 4.5) {
  if (!color || !surface) {
    return undefined
  }

  const original = toOklch(color)
  const surfaceColor = toOklch(surface)
  if (!original || typeof original.l !== 'number' || !surfaceColor || typeof surfaceColor.l !== 'number') {
    return { mode: 'none' }
  }

  const defaultBlend = blendOver(color, surface, TONAL_BACKGROUND_OPACITY)
  if (!defaultBlend) {
    return { mode: 'none' }
  }

  if (meetsContrast(defaultBlend, color, targetContrast)) {
    return { mode: 'none' }
  }

  const background = adjustLightnessForContrast(original, color, surfaceColor.l, targetContrast)
  if (background) {
    return { mode: 'background', textColor: color, background }
  }

  const textTargetLightness = surfaceColor.l >= 0.5 ? 0 : 1
  const textColor = adjustLightnessForContrast(original, defaultBlend, textTargetLightness, targetContrast)
  if (textColor) {
    return { mode: 'text', textColor }
  }

  return { mode: 'none' }
}

/** Format a color for Vuetify theme CSS variables (`rgb(var(--v-theme-…))`).
 * Expects the color as hex string, e.g. `#ff0000`.
 */
export function colorToVuetifyRgb (color) {
  try {
    const rgb = toSrgbGamut(toOklch(color))
    if (!rgb || typeof rgb.r !== 'number') {
      return undefined
    }
    const { r, g, b } = rgb
    return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`
  } catch {
    return undefined
  }
}

function applyErrorChipCssVars (vars) {
  const root = document.documentElement
  if (!vars) {
    root.style.removeProperty(ERROR_CHIP_BACKGROUND_VAR)
    root.style.removeProperty(ERROR_CHIP_TEXT_VAR)
    return
  }
  root.style.setProperty(ERROR_CHIP_BACKGROUND_VAR, vars.backgroundRgb)
  root.style.setProperty(ERROR_CHIP_TEXT_VAR, vars.textRgb)
}

function createErrorChipCssVars (theme) {
  return computed(() => {
    const errorColor = theme.current.value?.colors?.error
    if (!errorColor) {
      return undefined
    }

    const accessible = pickAccessibleChipColors(errorColor)
    if (!accessible) {
      return undefined
    }

    const backgroundRgb = colorToVuetifyRgb(accessible.background)
    const textRgb = colorToVuetifyRgb(accessible.textColor)
    if (!backgroundRgb || !textRgb) {
      return undefined
    }

    return { backgroundRgb, textRgb }
  })
}

/**
 * Ensure error status chips are readable without changing the global theme `error` color
 * (which would affect buttons, alerts, charts, etc.).
 *
 * Computes an accessible pair of bg and text colors from the current theme and exposes it as CSS
 * custom properties.
 *
 */
export function useAccessibleErrorChipColors (theme) {
  if (theme) {
    return { errorChipCssVars: createErrorChipCssVars(theme) }
  }

  if (!sharedErrorChipCssVars) {
    sharedErrorChipScope = effectScope(true)
    sharedErrorChipScope.run(() => {
      sharedErrorChipCssVars = createErrorChipCssVars(useTheme())
      watchEffect(() => {
        applyErrorChipCssVars(sharedErrorChipCssVars.value)
      })
    })
  }

  return { errorChipCssVars: sharedErrorChipCssVars }
}

function applyWarningChipCssVars (vars) {
  const root = document.documentElement
  root.style.removeProperty(WARNING_CHIP_TEXT_VAR)
  root.style.removeProperty(WARNING_CHIP_BACKGROUND_VAR)
  root.style.removeProperty(WARNING_CHIP_BACKGROUND_OPACITY_VAR)

  if (!vars || vars.mode === 'none') {
    return
  }

  if (vars.mode === 'background') {
    root.style.setProperty(WARNING_CHIP_BACKGROUND_VAR, vars.backgroundRgb)
    root.style.setProperty(WARNING_CHIP_BACKGROUND_OPACITY_VAR, vars.backgroundOpacity)
    return
  }

  if (vars.mode === 'text') {
    root.style.setProperty(WARNING_CHIP_TEXT_VAR, vars.textRgb)
  }
}

function createWarningChipCssVars (theme) {
  return computed(() => {
    const warningColor = theme.current.value?.colors?.warning
    if (!warningColor) {
      return undefined
    }

    const surface = theme.current.value?.colors?.surface ??
     (theme.current.value?.dark ? DARK_SURFACE : LIGHT_SURFACE)

    const accessible = pickAccessibleTonalChipColors(warningColor, surface)
    if (!accessible) {
      return undefined
    }

    if (accessible.mode === 'none') {
      return { mode: 'none' }
    }

    if (accessible.mode === 'background') {
      const backgroundRgb = colorToVuetifyRgb(accessible.background)
      if (!backgroundRgb) {
        return undefined
      }
      return {
        mode: 'background',
        backgroundRgb,
        backgroundOpacity: '1',
      }
    }

    const textRgb = colorToVuetifyRgb(accessible.textColor)
    if (!textRgb) {
      return undefined
    }
    return { mode: 'text', textRgb }
  })
}

/**
 * Ensure tonal warning chips (e.g. worker group) stay readable without changing
 * the global theme `warning` color.
 *
 * Prefers adjusting only the background; otherwise adjusts only the text color.
 * Exposes the result as document CSS custom properties.
 */
export function useAccessibleWarningChipColors (theme) {
  if (theme) {
    return { warningChipCssVars: createWarningChipCssVars(theme) }
  }

  if (!sharedWarningChipCssVars) {
    sharedWarningChipScope = effectScope(true)
    sharedWarningChipScope.run(() => {
      sharedWarningChipCssVars = createWarningChipCssVars(useTheme())
      watchEffect(() => {
        applyWarningChipCssVars(sharedWarningChipCssVars.value)
      })
    })
  }

  return { warningChipCssVars: sharedWarningChipCssVars }
}

/** Util for resetting shared state between tests. */
export function resetAccessibleChipColorCache () {
  sharedErrorChipScope?.stop()
  sharedErrorChipScope = undefined
  sharedErrorChipCssVars = undefined
  applyErrorChipCssVars(undefined)

  sharedWarningChipScope?.stop()
  sharedWarningChipScope = undefined
  sharedWarningChipCssVars = undefined
  applyWarningChipCssVars(undefined)
}

/** Alias kept for existing tests; resets error and warning chip shared state. */
export function resetErrorChipColorCache () {
  resetAccessibleChipColorCache()
}
