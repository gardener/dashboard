//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export function NAND (a, b) {
  if (typeof a !== 'boolean' || typeof b !== 'boolean') {
    throw new TypeError('Both arguments must be of type boolean')
  }
  return !(a === b)
}
