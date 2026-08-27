//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  isMdiIcon,
  mdiIcons,
} from '@/utils/mdiIcons'

describe('mdiIcons util', () => {
  it('should validate known icons', () => {
    expect(isMdiIcon('mdi-account')).toBe(true)
    expect(isMdiIcon('mdi-nonexistent-icon')).toBe(false)
  })

  it('should expose icon names', () => {
    expect(mdiIcons).toContain('mdi-account')
  })
})
