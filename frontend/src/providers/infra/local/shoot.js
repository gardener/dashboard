//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

// Local Shoots do not support zoned worker groups.
export function isZoned () {
  return false
}
