//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { NotFound } = require('http-errors')
const { createClient } = require('../lib')

describe('kube-client', () => {
  describe('Client', () => {
    const bearer = 'bearer'
    const namespace = 'namespace'
    const name = 'name'

    let testClient
    let getSecretStub

    beforeEach(() => {
      testClient = createClient({ auth: { bearer } })
      getSecretStub = jest.spyOn(testClient.core.secrets, 'get')
    })

    it('should create a client', () => {
      expect(testClient.constructor.name).toBe('Client')
      expect(testClient.cluster.server.hostname).toBe('kubernetes')
    })

    it('should read a kubeconfig from a secret', async () => {
      getSecretStub.mockReturnValue({
        data: {
          kubeconfig: Buffer.from('foo').toString('base64')
        }
      })
      const kubeconfig = await testClient.getKubeconfig({ namespace, name })
      expect(getSecretStub).toHaveBeenCalledWith(namespace, name)
      expect(kubeconfig).toBe('foo')
    })

    it('should not find a kubeconfig in the secret', async () => {
      getSecretStub.mockReturnValue({
        data: {}
      })
      await expect(testClient.getKubeconfig({ namespace, name })).rejects.toThrow(NotFound)
    })
  })
})
