//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import { PassThrough } from 'node:stream'

const { default: request } = await vi.importActual('@gardener-dashboard/request')

const mockClient = {
  request: vi.fn(),
  stream: vi.fn(() => Promise.resolve(new PassThrough({ objectMode: true }))),
}

export default {
  ...request,
  extend: vi.fn(() => mockClient),
  mockClient,
}
