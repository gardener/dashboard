//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
// src/composables/usePickValues.js
import {
  computed,
  toValue,
} from 'vue'

import get from 'lodash/get'

/**
 * Expose one-level-unwrapped *reactive* views on selected fields of a (maybe
 * reactive) **source object**, without ever losing reactivity when the *entire*
 * source object is replaced.
 *
 * ─────────────────────────  Why this helper exists  ─────────────────────────
 * In tables or lists it is common to:
 *   1. keep each row item in a reactive/`ref` wrapper so it can be swapped out
 *      wholesale (`itemRef.value = nextRow`)
 *   2. store the row’s own dynamic data in nested `ref`s / `computed`s
 *
 * Accessing such data naïvely forces the consumer to write **two** `.value`s
 * (“row → field”), and the moment the row object itself changes, the template
 * loses its dependency unless every access is re-wrapped in a `computed`.
 *
 * This helper solves both problems:
 *
 *  • It returns a *computed* for each requested key that depends on
 *    – `src` itself **and**
 *    – the inner `ref`/`computed` (if present),
 *    so updates propagate whether you mutate the field *or* swap the object.
 *
 *  • Inside that computed it unwraps **one** level of reactivity
 *    (`ref` → plain value, `computed` → plain value),
 *    letting the template use a single `.value`.
 *
 * ---------------------------------------------------------------------------
 * @param {import('vue').MaybeRefOrGetter<object>} src
 *        Any reactive source: plain object, ref, computed, or getter.
 * @param {...string} keys
 *        Property names to expose.
 * @returns {Record<string, import('vue').ComputedRef<unknown>>}
 *          An object whose properties are *computed refs* of the unwrapped
 *          field values.  Each computed stays in sync both with inner reactive
 *          mutations **and** with replacements of the root object.
 */
export function useUnwrapReactive (src, ...keys) {
  return Object.fromEntries(
    keys.map(k => [k, computed(() => {
      const valueRef = get(toValue(src), [k])
      return get(valueRef, ['value'])
    })]),
  )
}
