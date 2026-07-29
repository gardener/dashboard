//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const TONAL_COLOR_NAMES = Object.freeze([
  'primary',
  'secondary',
  'accent',
  'error',
  'info',
  'success',
  'warning',
  'unknown',
])

const tonalColorNames = new Set(TONAL_COLOR_NAMES)

export function getTonalColorName (color) {
  if (!tonalColorNames.has(color)) {
    return color
  }
  return `tonal${color.charAt(0).toUpperCase()}${color.slice(1)}`
}
