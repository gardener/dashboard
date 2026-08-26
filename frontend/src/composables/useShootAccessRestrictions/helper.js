//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

export function NAND (a, b) {
  if (typeof a !== 'boolean' || typeof b !== 'boolean') {
    throw new TypeError('Both arguments must be of type boolean')
  }
  return !(a === b)
}
