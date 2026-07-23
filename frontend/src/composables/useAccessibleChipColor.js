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

let sharedErrorChipCssVars
let sharedErrorChipScope

function meetsContrast (background, textColor, targetContrast) {
  try {
    return wcagContrast(background, textColor) >= targetContrast
  } catch {
    return false
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

/** Util for resetting shared state between tests. */
export function resetErrorChipColorCache () {
  sharedErrorChipScope?.stop()
  sharedErrorChipScope = undefined
  sharedErrorChipCssVars = undefined
  applyErrorChipCssVars(undefined)
}
