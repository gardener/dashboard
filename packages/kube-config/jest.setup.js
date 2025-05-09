//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { jest } from '@jest/globals'

const gtokenMock = await import('./__mocks__/gtoken.js')
jest.unstable_mockModule('gtoken', () => {
  return gtokenMock
})

jest.resetModules()
