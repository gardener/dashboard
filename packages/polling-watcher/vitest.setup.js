//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi, expect } from 'vitest'
import testUtils from '@gardener-dashboard/test-utils'

const { matchers } = testUtils
expect.extend(matchers)

vi.mock('@gardener-dashboard/logger', async () => {
  return import('./__tests__/mocks/@gardener-dashboard/logger.js')
})
