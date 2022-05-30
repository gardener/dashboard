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

    const certificateAuthorityData = Buffer.from('certificate-authority-data').toString('base64')
    const clientCertificateData = Buffer.from('client-certificate-data').toString('base64')

    let testClient
    let getSecretStub
    let createShootAdminKubeconfigStub

    beforeEach(() => {
      testClient = createClient({ auth: { bearer } })
      getSecretStub = jest.spyOn(testClient.core.secrets, 'get')
      createShootAdminKubeconfigStub = jest.spyOn(testClient['core.gardener.cloud'].shoots, 'createAdminKubeconfigRequest')
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
    })

    it('should get shoot adminkubeconfig', async () => {
      const user = {
        'client-certificate-data': certificateAuthorityData,
        'client-key-data': clientCertificateData
      }
      const testKubeconfig = fixtures.helper.createTestKubeconfig(user, { server })
      createShootAdminKubeconfigStub.mockReturnValue({
        status: {
          kubeconfig: Buffer.from(testKubeconfig.toYAML()).toString('base64')
        }
      })
      const kubeconfig = await testClient.createShootAdminKubeconfig({ namespace, name })
      expect(createShootAdminKubeconfigStub).toHaveBeenCalledWith(namespace, name, {
        apiVersion: 'authentication.gardener.cloud/v1alpha1',
        kind: 'AdminKubeconfigRequest',
        spec: { expirationSeconds: 600 }
      })
      expect(kubeconfig.currentUser['client-certificate-data']).toBe(certificateAuthorityData)
      expect(kubeconfig.currentUser['client-key-data']).toBe(clientCertificateData)
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
      expect(extend).toHaveBeenCalledTimes(25)
      expect(extend).toHaveBeenCalledWith(expect.objectContaining({
        servername,
        headers
      }))
    })
  })
})
