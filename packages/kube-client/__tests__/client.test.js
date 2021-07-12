//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { NotFound } = require('http-errors')
const { createClient, createDashboardClient } = require('../lib')
const { extend } = require('@gardener-dashboard/request')
const { mockLoadResult } = require('@gardener-dashboard/kube-config')

describe('kube-client', () => {
  describe('#createClient', () => {
    const bearer = 'bearer'
    const namespace = 'namespace'
    const name = 'name'
    const server = 'server'

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
      const testKubeconfig = fixtures.helper.createTestKubeconfig({ token: bearer }, { server })
      getSecretStub.mockReturnValue({
        data: {
          kubeconfig: Buffer.from(testKubeconfig.toYAML()).toString('base64')
        }
      })
      const kubeconfig = await testClient.getKubeconfig({ namespace, name })
      expect(getSecretStub).toHaveBeenCalledWith(namespace, name)
      expect(kubeconfig.currentUser.token).toBe(bearer)
      expect(kubeconfig.currentCluster.server).toBe(server)
    })

    it('should not find a "kubeconfig" in the secret', async () => {
      getSecretStub.mockReturnValue({
        data: {}
      })
      await expect(testClient.getKubeconfig({ namespace, name })).rejects.toThrow(NotFound)
    })

    it('should not find a "serviceaccount.json" in the secret', async () => {
      const testKubeconfig = fixtures.helper.createTestKubeconfig({ 'auth-provider': { name: 'gcp' } })
      getSecretStub.mockReturnValue({
        data: {
          kubeconfig: Buffer.from(testKubeconfig.toYAML()).toString('base64')
        }
      })
      await expect(testClient.getKubeconfig({ namespace, name })).rejects.toThrow(NotFound)
    })
  })

  describe('#createDashboardClient', () => {
    const server = new URL(mockLoadResult.url)
    const servername = server.hostname
    const headers = {
      authorization: `Bearer ${mockLoadResult.auth.bearer}`
    }

    let testClient

    beforeEach(() => {
      jest.clearAllMocks()
      testClient = createDashboardClient()
    })

    it('should create a dashboard client', () => {
      expect(testClient.constructor.name).toBe('Client')
      expect(testClient.cluster.server).toEqual(server)
      expect(extend).toHaveBeenCalledTimes(24)
      expect(extend).toHaveBeenCalledWith(expect.objectContaining({
        servername,
        headers
      }))
    })
  })
})
