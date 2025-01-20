//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockClient } = require('@gardener-dashboard/request')
const { Shoot } = require('../lib/resources/GardenerCore')

describe('kube-client', () => {
  describe('resources', () => {
    describe('core.gardener.cloud', () => {
      describe('shoots', () => {
        const url = 'http://example.org'
        const namespace = 'default'
        const name = 'test'
        const data = { foo: 'bar' }

        let shoot

        beforeEach(() => {
          shoot = new Shoot({ url })
          mockClient.request.mockImplementation((...args) => args)
        })

        it('should create an adminkubeconfig subresource', async () => {
          const args = await shoot.createAdminKubeconfigRequest(namespace, name, data)
          expect(args).toEqual([
            `namespaces/${namespace}/shoots/${name}/adminkubeconfig`,
            {
              method: 'post',
              json: data,
            },
          ])
        })
      })
    })
  })
})
