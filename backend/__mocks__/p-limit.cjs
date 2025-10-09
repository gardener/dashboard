//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const mockPLimit = jest.createMockFromModule('p-limit')
const pLimit = jest.requireActual('p-limit')

mockPLimit.mockImplementation(pLimit)

module.exports = mockPLimit
