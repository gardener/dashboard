//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { load, ...kubeconfig } = jest.requireActual('@gardener-dashboard/kube-config')

const mockLoadResult = load({ NODE_ENV: 'test' })

module.exports = {
  ...kubeconfig,
  load: jest.fn().mockReturnValue(mockLoadResult),
  mockLoadResult
}
