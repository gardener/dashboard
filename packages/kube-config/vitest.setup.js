//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

vi.mock('gtoken', async () => {
  return import('./__vitest__/mocks/gtoken.js')
})
