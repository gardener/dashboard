//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  toBeWithinRange (value, floor, ceiling) {
    const pass = value >= floor && value <= ceiling
    const phrase = pass ? 'not to be' : 'to be'
    return {
      message () {
        return `expected ${value} ${phrase} to be within range ${floor} - ${ceiling}`
      },
      pass,
    }
  },
}
