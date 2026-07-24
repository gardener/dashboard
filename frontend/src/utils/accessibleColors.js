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
const TONAL_BACKGROUND_OPACITY = 0.12

function meetsContrast (background, foreground, targetContrast) {
  try {
    return wcagContrast(background, foreground) >= targetContrast
  } catch {
    return false
  }
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

/** Prefers white text when it meets AA contrast, otherwise uses black. */
export function pickAccessibleTextColor (background) {
  if (!background) {
    return undefined
  }

  const original = toOklch(background)
  if (!original || typeof original.l !== 'number') {
    return WHITE
  }

  return wcagContrast(background, WHITE) >= 4.5 ? WHITE : BLACK
}

function adjustTonalColorForContrast (
  originalColor,
  surfaceColor,
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
    const background = createTonalBackgroundColor(candidate, surfaceColor)

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
 * tonal foreground and as a translucent underlay over `surfaceColor`.
 *
 * @param {string} color Base theme color
 * @param {string} surfaceColor Backdrop color under the tonal component
 */
export function pickAccessibleTonalColor (color, surfaceColor, {
  targetContrast = 4.5,
} = {}) {
  if (!color || !surfaceColor) {
    return undefined
  }

  const originalColor = toOklch(color)
  const surface = toOklch(surfaceColor)
  if (
    !originalColor ||
    typeof originalColor.l !== 'number' ||
    !surface ||
    typeof surface.l !== 'number'
  ) {
    return undefined
  }

  const tonalBackground = createTonalBackgroundColor(color, surfaceColor)
  if (!tonalBackground) {
    return undefined
  }
  if (meetsContrast(tonalBackground, color, targetContrast)) {
    return color
  }

  const preferLightText = wcagContrast(surfaceColor, WHITE) >= wcagContrast(surfaceColor, BLACK)
  const preferredLightness = preferLightText ? 1 : 0
  const preferred = adjustTonalColorForContrast(
    originalColor,
    surfaceColor,
    preferredLightness,
    targetContrast,
  )
  if (preferred) {
    return preferred
  }

  return adjustTonalColorForContrast(
    originalColor,
    surfaceColor,
    1 - preferredLightness,
    targetContrast,
  )
}
