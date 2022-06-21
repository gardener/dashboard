//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cleanKubeconfig, ...kubeconfig } = jest.requireActual('@gardener-dashboard/kube-config')

module.exports = {
  ...kubeconfig,
  cleanKubeconfig: jest.fn().mockImplementation(cleanKubeconfig)
}
