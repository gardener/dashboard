//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import 'abort-controller/polyfill'
import testUtils from '@gardener-dashboard/test-utils'

const { matchers } = testUtils

expect.extend(matchers)

const requestMock = await import('./__mocks__/@gardener-dashboard/request.js')
jest.unstable_mockModule('@gardener-dashboard/request', () => {
  return requestMock
})

const kubeConfigMock = await import('./__mocks__/@gardener-dashboard/kube-config.js')
jest.unstable_mockModule('@gardener-dashboard/kube-config', () => {
  return kubeConfigMock
})
