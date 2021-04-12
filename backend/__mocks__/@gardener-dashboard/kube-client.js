//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const kubeClient = jest.requireActual('@gardener-dashboard/kube-client')

module.exports = {
  ...kubeClient,
  createDashboardClient: jest.fn().mockImplementation(kubeClient.createDashboardClient)
}
