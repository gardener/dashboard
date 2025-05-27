//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// tests/useUnwrapReactive.spec.js
import {
  describe,
  it,
  expect,
  beforeEach,
} from 'vitest'
import {
  ref,
  toRef,
  toRefs,
  computed,
  nextTick,
} from 'vue'

import { useUnwrapReactive } from '@/composables/useUnwrapReactive'

function makeItem (value) {
  const computedValueRef = ref(value)

  return {
    item: {
      innerComposable: {
        computedProp: computed(() => computedValueRef.value),
      },
    },

    // returned so the tests can mutate them
    sources: { computedValueRef },
  }
}

describe('useUnwrapReactive', () => {
  let itemRef
  let sources
  let composable

  beforeEach(() => {
    const firstItem = makeItem(1)
    itemRef = toRef(firstItem, 'item')
    sources = firstItem.sources
    composable = computed(() => itemRef.value.innerComposable)
  })

  it('unwraps inner refs (template needs only one .value)', () => {
    const { computedProp: computedPropReactive } = useUnwrapReactive(
      composable,
      'computedProp',
    )
    const { computedProp } = toRefs(itemRef.value.innerComposable)
    expect(computedPropReactive.value).toBe(1)
    expect(computedProp.value).toBe(1)
  })

  it('updates when an inner ref mutates', async () => {
    const { computedProp: computedPropReactive } = useUnwrapReactive(
      composable,
      'computedProp',
    )
    const { computedProp } = toRefs(itemRef.value.innerComposable)

    sources.computedValueRef.value = 3
    await nextTick()

    expect(computedPropReactive.value).toBe(3)
    expect(computedProp.value).toBe(3)
  })

  it('updates when the whole item object is replaced', async () => {
    const { computedProp: computedPropReactive } = useUnwrapReactive(
      composable,
      'computedProp',
    )
    const { computedProp } = toRefs(itemRef.value.innerComposable)

    const secondItem = makeItem(5)

    // Vue re-uses the <tr> instance for a different array element
    itemRef = toRef(secondItem, 'item')
    await nextTick()

    expect(computedPropReactive.value).toBe(5)
    expect(computedProp.value).toBe(1) // old value, not reactive

    // // still reactive afterwards
    secondItem.sources.computedValueRef.value = 9
    await nextTick()
    expect(computedPropReactive.value).toBe(9)
  })
})
