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
  toGamut,
  wcagContrast,
} from 'culori'

const toOklch = converter('oklch')
const toSrgbGamut = toGamut('rgb', 'oklch')

const WHITE = '#ffffff'
const BLACK = '#000000'

export const ERROR_CHIP_CLASS = 'g-error-chip'
export const ERROR_CHIP_BG_VAR = '--g-error-chip'
export const ERROR_CHIP_ON_VAR = '--g-error-chip-on'

let sharedErrorChipCssVars
let sharedErrorChipScope

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

  const darkerForWhite = findLightnessCandidate(original, WHITE, 0, targetContrast)
  if (darkerForWhite) {
    return { background: darkerForWhite, textColor: WHITE }
  }

  if (meetsContrast(background, BLACK, targetContrast)) {
    return { background, textColor: BLACK }
  }

  const lighterForBlack = findLightnessCandidate(original, BLACK, 1, targetContrast)
  if (lighterForBlack) {
    return { background: lighterForBlack, textColor: BLACK }
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
    root.style.removeProperty(ERROR_CHIP_BG_VAR)
    root.style.removeProperty(ERROR_CHIP_ON_VAR)
    return
  }
  root.style.setProperty(ERROR_CHIP_BG_VAR, vars[ERROR_CHIP_BG_VAR])
  root.style.setProperty(ERROR_CHIP_ON_VAR, vars[ERROR_CHIP_ON_VAR])
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

    return {
      [ERROR_CHIP_BG_VAR]: backgroundRgb,
      [ERROR_CHIP_ON_VAR]: textRgb,
    }
  })
}

/**
 * Computes accessible error-chip colors and syncs them to document CSS variables.
 * Call once from the app root. Status chips opt in with class {@link ERROR_CHIP_CLASS}.
 *
 * Pass an explicit `theme` to compute without syncing (tests).
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

export function resetErrorChipColorCache () {
  sharedErrorChipScope?.stop()
  sharedErrorChipScope = undefined
  sharedErrorChipCssVars = undefined
  applyErrorChipCssVars(undefined)
}
