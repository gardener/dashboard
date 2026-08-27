//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const { default: pLimit } = await vi.importActual('p-limit')

const mockPLimit = vi.fn().mockImplementation(pLimit)

export default mockPLimit
