//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Config, ClientConfig, cleanKubeconfig, ...originalKubeconfig } = jest.requireActual('@gardener-dashboard/kube-config')

const mockLoadResult = new ClientConfig(Config.build({
  server: 'https://kubernetes:6443'
}, {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
}))

module.exports = {
  ...originalKubeconfig,
  cleanKubeconfig: jest.fn().mockImplementation(cleanKubeconfig),
  load: jest.fn().mockReturnValue(mockLoadResult),
  mockLoadResult
}
