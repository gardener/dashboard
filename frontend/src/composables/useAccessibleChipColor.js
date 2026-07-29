//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  blend,
  formatHex,
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

/** Match Vuetify's tonal variant opacity when calculating its visible background color. */
export const TONAL_BACKGROUND_OPACITY = 0.12

function meetsContrast (background, textColor, targetContrast) {
  try {
    return wcagContrast(background, textColor) >= targetContrast
  } catch {
    return false
  }
}

function createChipColorResult (background, textColor, backgroundChanged = false) {
  return {
    background,
    textColor,
    backgroundChanged,
    textColorChanged: false,
  }
}

function pickHigherContrastTextColor (background) {
  return wcagContrast(background, WHITE) >= wcagContrast(background, BLACK)
    ? WHITE
    : BLACK
}

export function createTonalBackgroundColor (
  foreground,
  background,
  opacity = TONAL_BACKGROUND_OPACITY,
) {
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
 * @param {object} originalColor Culori OKLCH color object
 * @param {string} textColor Contrast partner
 * @param {number} targetLightness Unitless OKLCH lightness (0 = black, 1 = white)
 * @param {number} targetContrast Minimum WCAG contrast ratio
 * @returns {string|null} Hex color, or null
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
 * Chooses an accessible background and text pair for an arbitrary flat chip.
 * White text is preferred and the background is darkened only when necessary.
 */
export function pickAccessibleChipColors (background, {
  targetContrast = 4.5,
} = {}) {
  if (!background) {
    return undefined
  }

  const original = toOklch(background)
  if (!original || typeof original.l !== 'number') {
    return createChipColorResult(background, WHITE)
  }

  if (meetsContrast(background, WHITE, targetContrast)) {
    return createChipColorResult(background, WHITE)
  }

  const adjustedBackground = adjustLightnessForContrast(
    original,
    WHITE,
    0,
    targetContrast,
  )

  return adjustedBackground
    ? createChipColorResult(adjustedBackground, WHITE, true)
    : createChipColorResult(background, WHITE)
}

function adjustTonalColorForContrast (
  originalColor,
  surface,
  targetLightness,
  targetContrast,
) {
  let failing = 0
  let passing = 1
  let result

  for (let i = 0; i < 30; i++) {
    const position = (failing + passing) / 2
    const lightness = originalColor.l + (targetLightness - originalColor.l) * position
    const candidate = formatHex(toSrgbGamut({ ...originalColor, l: lightness }))
    const background = createTonalBackgroundColor(candidate, surface)

    if (candidate && background && meetsContrast(background, candidate, targetContrast)) {
      result = candidate
      passing = position
    } else {
      failing = position
    }
  }

  return result
}

/**
 * Returns a single theme color that remains readable when Vuetify uses it both as
 * tonal foreground and as a translucent underlay over `surface`.
 */
export function pickAccessibleTonalColor (color, surface, {
  targetContrast = 4.5,
} = {}) {
  if (!color || !surface) {
    return undefined
  }

  const original = toOklch(color)
  const surfaceColor = toOklch(surface)
  if (
    !original ||
    typeof original.l !== 'number' ||
    !surfaceColor ||
    typeof surfaceColor.l !== 'number'
  ) {
    return undefined
  }

  const tonalBackground = createTonalBackgroundColor(color, surface)
  if (!tonalBackground) {
    return undefined
  }
  if (meetsContrast(tonalBackground, color, targetContrast)) {
    return color
  }

  const targetColor = pickHigherContrastTextColor(surface)
  const targetLightness = targetColor === WHITE ? 1 : 0
  return adjustTonalColorForContrast(
    original,
    surface,
    targetLightness,
    targetContrast,
  )
}
