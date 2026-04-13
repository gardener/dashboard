//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const { default: kubeClient } = await vi.importActual('@gardener-dashboard/kube-client')

const mockModule = {
  ...kubeClient,
  createDashboardClient: vi.fn().mockImplementation(kubeClient.createDashboardClient),
}

// Export as both default and named exports so tests can use either pattern
export default mockModule
export const {
  createClient,
  createDashboardClient,
  abortWatcher,
  dashboardClient,
  Resources,
  Store,
} = mockModule
