//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import testUtils from '@gardener-dashboard/test-utils'

const { matchers } = testUtils
expect.extend(matchers)

const loggerMock = await import('./__mocks__/@gardener-dashboard/logger.js')
jest.unstable_mockModule('@gardener-dashboard/logger', () => {
  return loggerMock
})
