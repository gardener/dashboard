//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
const request = await import('@gardener-dashboard/request')
const { default: { mockClient } } = request
const gardenerCore = await import('../lib/resources/GardenerCore')
const { Shoot } = gardenerCore

describe('kube-client', () => {
  describe('resources', () => {
    describe('core.gardener.cloud', () => {
      describe('shoots', () => {
        const url = 'http://example.org'
        const namespace = 'default'
        const name = 'test'
        const data = { foo: 'bar' }

        let shootInstance

        beforeEach(() => {
          shootInstance = new Shoot({ url })
          mockClient.request.mockImplementation((...args) => args)
        })

        it('should create an adminkubeconfig subresource', async () => {
          const args = await shootInstance.createAdminKubeconfigRequest(namespace, name, data)
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
