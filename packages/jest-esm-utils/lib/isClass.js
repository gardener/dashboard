//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export function isClass (obj) {
  if (typeof obj !== 'function') return false

  if (obj.prototype && typeof obj.prototype === 'object' && obj.prototype.constructor === obj) {
    try {
      if (/^class\s/.test(Function.prototype.toString.call(obj))) {
        return true
      }
    } catch {
      // Handle cases where toString is tampered or inaccessible
      return false
    }
  }
  return false
}
