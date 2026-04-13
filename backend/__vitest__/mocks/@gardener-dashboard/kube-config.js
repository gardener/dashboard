//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const { default: actual } = await vi.importActual('@gardener-dashboard/kube-config')
const { Config, ClientConfig, cleanKubeconfig, parseKubeconfig, ...originalKubeconfig } = actual

const mockLoadResult = new ClientConfig(Config.build({
  server: 'https://kubernetes:6443',
}, {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw',
}))

const mockModule = {
  ...originalKubeconfig,
  Config,
  ClientConfig,
  parseKubeconfig,
  cleanKubeconfig: vi.fn().mockImplementation(cleanKubeconfig),
  load: vi.fn().mockReturnValue(mockLoadResult),
  mockLoadResult,
}

export default mockModule
export { Config, ClientConfig, mockLoadResult, parseKubeconfig }
export const load = mockModule.load
