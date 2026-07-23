//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { useTheme } from 'vuetify'
import {
  converter,
  toGamut,
  wcagContrast,
} from 'culori'

const toOklch = converter('oklch')
const toSrgbGamut = toGamut('rgb', 'oklch')

const WHITE = '#ffffff'
const BLACK = '#000000'

function meetsContrast (background, textColor, targetContrast) {
  try {
    return wcagContrast(background, textColor) >= targetContrast
  } catch {
    return false
  }
}

function findLightnessCandidate (original, textColor, targetLightness, targetContrast) {
  let failing = 0
  let passing = 1
  let result = null

  for (let i = 0; i < 30; i++) {
    const position = (failing + passing) / 2
    const lightness = original.l + (targetLightness - original.l) * position
    const candidate = toSrgbGamut({ ...original, l: lightness })

    if (meetsContrast(candidate, textColor, targetContrast)) {
      result = candidate
      passing = position
    } else {
      failing = position
    }
  }

  return result
}

/**
 * Pick a chip background and text color that meet WCAG AA contrast.
 * Prefers white text (darkening the background if needed); falls back to black text.
 *
 * @param {string} background
 * @param {number} [targetContrast=4.5]
 * @returns {{ background: string|object, textColor: string }|undefined}
 */
export function pickAccessibleChipColors (background, targetContrast = 4.5) {
  if (!background) {
    return undefined
  }

  // Prefer the classic filled-chip look: white text on the theme color.
  if (meetsContrast(background, WHITE, targetContrast)) {
    return { background, textColor: WHITE }
  }

  const original = toOklch(background)
  if (!original || typeof original.l !== 'number') {
    return { background, textColor: WHITE }
  }

  const darkerForWhite = findLightnessCandidate(original, WHITE, 0, targetContrast)
  if (darkerForWhite) {
    return { background: darkerForWhite, textColor: WHITE }
  }

  // White text is unreachable — fall back to black text.
  if (meetsContrast(background, BLACK, targetContrast)) {
    return { background, textColor: BLACK }
  }

  const lighterForBlack = findLightnessCandidate(original, BLACK, 1, targetContrast)
  if (lighterForBlack) {
    return { background: lighterForBlack, textColor: BLACK }
  }

  // Fail open: keep the original color and the better of black/white text.
  try {
    const textColor = wcagContrast(background, WHITE) >= wcagContrast(background, BLACK)
      ? WHITE
      : BLACK
    return { background, textColor }
  } catch {
    return { background, textColor: WHITE }
  }
}

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

/**
 * Reactive local `--v-theme-error` / `--v-theme-on-error` overrides for flat
 * error chips so chip text remains readable regardless of the active theme.
 *
 * @param {ReturnType<typeof useTheme>} [theme]
 */
export function useErrorChipColor (theme = useTheme()) {
  const errorChipStyle = computed(() => {
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

    return {
      '--v-theme-error': backgroundRgb,
      '--v-theme-on-error': textRgb,
    }
  })

  return { errorChipStyle }
}
