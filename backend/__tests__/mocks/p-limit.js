//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const { default: pLimit } = await vi.importActual('p-limit')

const mockPLimit = vi.fn().mockImplementation(pLimit)

export default mockPLimit
