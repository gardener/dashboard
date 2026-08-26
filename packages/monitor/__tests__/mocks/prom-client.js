//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const promClient = await vi.importActual('prom-client')

const register = promClient.register

export default {
  ...promClient,
  register: {
    ...register,
    contentType: register.contentType, // property not enumerable
    registerMetric: vi.fn(),
    metrics: vi.fn(),
    clear: vi.fn(),
  },
  collectDefaultMetrics: vi.fn(),
  linearBuckets: vi.fn(),
}
