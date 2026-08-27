//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

vi.mock('gtoken', async () => {
  return import('./__tests__/mocks/gtoken.js')
})
