//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { PassThrough } from 'node:stream'
import request from '@gardener-dashboard/request'

const mockClient = {
  request: jest.fn(),
  stream: jest.fn(() => Promise.resolve(new PassThrough({ objectMode: true }))),
}

export default {
  ...request,
  extend: jest.fn(() => mockClient),
  mockClient,
}
