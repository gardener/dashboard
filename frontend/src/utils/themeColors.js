//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const SEMANTIC_COLOR_NAMES = Object.freeze([
  'primary',
  'secondary',
  'accent',
  'error',
  'info',
  'success',
  'warning',
  'unknown',
])

const semanticColorNames = new Set(SEMANTIC_COLOR_NAMES)

export function getTonalColorName (color) {
  if (!semanticColorNames.has(color)) {
    return color
  }
  return `tonal-${color}`
}

export function getFlatColorName (color) {
  if (!semanticColorNames.has(color)) {
    return color
  }
  return `flat-${color}`
}

export function getOnFlatColorName (color) {
  if (!semanticColorNames.has(color)) {
    return color
  }
  return `on-flat-${color}`
}

const derivedColorNames = new Set(
  SEMANTIC_COLOR_NAMES.flatMap(color => [
    getTonalColorName(color),
    getFlatColorName(color),
    getOnFlatColorName(color),
  ]),
)

export function isDerivedColorName (name) {
  return derivedColorNames.has(name)
}
