//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { useTheme } from 'vuetify'
import {
  converter,
  differenceEuclidean,
  toGamut,
  wcagContrast,
} from 'culori'

const toOklch = converter('oklch')
const toSrgbGamut = toGamut('rgb', 'oklch')
const colorDifference = differenceEuclidean('oklab')

/**
 * Pick a background color that meets WCAG contrast against the given text color
 * while staying as close as possible to the original hue and chroma.
 *
 * @param {string} background
 * @param {string} [textColor='#ffffff']
 * @param {number} [targetContrast=4.5]
 * @returns {string|object} Original color string when already compliant / unreachable,
 *   otherwise an sRGB color object from culori.
 */
export function pickAccessibleBackgroundColor (background, textColor = '#ffffff', targetContrast = 4.5) {
  if (!background || !textColor) {
    return background
  }

  try {
    if (wcagContrast(background, textColor) >= targetContrast) {
      return background
    }
  } catch {
    return background
  }

  const original = toOklch(background)
  if (!original || typeof original.l !== 'number') {
    return background
  }

  const findCandidate = targetLightness => {
    let failing = 0
    let passing = 1
    let result = null

    for (let i = 0; i < 30; i++) {
      const position = (failing + passing) / 2
      const lightness = original.l + (targetLightness - original.l) * position
      const candidate = toSrgbGamut({ ...original, l: lightness })

      if (wcagContrast(textColor, candidate) >= targetContrast) {
        result = candidate
        passing = position
      } else {
        failing = position
      }
    }

    return result
  }

  const darker = findCandidate(0)
  const lighter = findCandidate(1)
  const candidates = [darker, lighter].filter(Boolean)

  if (candidates.length === 0) {
    return background
  }

  return candidates.reduce((best, candidate) =>
    colorDifference(original, candidate) < colorDifference(original, best) ? candidate : best,
  )
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
 * Reactive local `--v-theme-error` override for flat error chips so chip text
 * remains readable regardless of the active theme palette.
 *
 * @param {ReturnType<typeof useTheme>} [theme]
 */
export function useErrorChipColor (theme = useTheme()) {
  const errorChipStyle = computed(() => {
    const colors = theme.current.value?.colors ?? {}
    const errorColor = colors.error
    if (!errorColor) {
      return undefined
    }

    const textColor = colors['on-error'] ?? '#ffffff'
    const accessible = pickAccessibleBackgroundColor(errorColor, textColor)
    const rgb = colorToVuetifyRgb(accessible)
    if (!rgb) {
      return undefined
    }

    return { '--v-theme-error': rgb }
  })

  return { errorChipStyle }
}
