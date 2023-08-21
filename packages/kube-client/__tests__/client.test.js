//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { NotFound } = require('http-errors')
const { createClient, createDashboardClient } = require('../lib')
const { extend } = require('@gardener-dashboard/request')
const { mockLoadResult } = require('@gardener-dashboard/kube-config')

function resourceEndpoints () {
  let endpoints = []
  for (const name of Object.keys(require('../lib/groups'))) {
    endpoints = endpoints.concat(Object.keys(require(`../lib/resources/${name}`)))
  }
  return endpoints
}

function nonResourceEndpoints () {
  return Object.keys(require('../lib/nonResourceEndpoints').endpoints)
}

describe('kube-client', () => {
  describe('#createClient', () => {
    const bearer = 'bearer'
    const namespace = 'namespace'
    const name = 'name'
    const server = 'https://kubernetes:6443'

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

    it('should create a client from a kubeconfig', async () => {
      const testKubeconfig = fixtures.helper.createTestKubeconfig({ token: bearer }, { server })
      getSecretStub.mockReturnValue({
        data: {
          kubeconfig: Buffer.from(testKubeconfig.toYAML()).toString('base64')
        }
      })
      const client = await testClient.createKubeconfigClient({ namespace, name })
      expect(getSecretStub).toHaveBeenCalledWith(namespace, name)
      expect(client.cluster.server.hostname).toBe('kubernetes')
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
    const resourceEndpointNames = resourceEndpoints()
    const nonResourceEndpointNames = nonResourceEndpoints()

    const { url, auth } = mockLoadResult
    const server = new URL(url)
    let testClient

    beforeEach(() => {
      jest.clearAllMocks()
      testClient = createDashboardClient({})
    })

    it('should create a dashboard client', () => {
      expect(testClient.constructor.name).toBe('Client')
      expect(testClient.cluster.server).toEqual(server)
      const expectedNumberOfCalls = resourceEndpointNames.length + nonResourceEndpointNames.length
      expect(extend).toHaveBeenCalledTimes(expectedNumberOfCalls)
      for (let i = 0; i < extend.mock.calls.length; i++) {
        const call = extend.mock.calls[i]
        expect(call).toHaveLength(1)
        const clientConfig = call[0]
        expect(clientConfig.constructor.name).toBe('ClientConfig')
        expect(clientConfig.url).toBe(url)
        expect(clientConfig.auth).toBe(auth)
        // all endpoints except healthz have json responseType
        const healthzEnpointIndex = resourceEndpointNames.length + nonResourceEndpointNames.indexOf('healthz')
        const responseType = i !== healthzEnpointIndex ? 'json' : undefined
        expect(clientConfig.responseType).toBe(responseType)
      }
    })
  })
  describe('#dashboardClient', () => {
    let kubeConfig
    let kubeClient

    const mockKubeClient = () => {
      jest.isolateModules(() => {
        kubeConfig = require('@gardener-dashboard/kube-config')
        kubeClient = require('../lib')
      })
    }

    it('should abort watching kubeconfig changes', () => {
      mockKubeClient()
      expect(kubeConfig.load).toBeCalledTimes(1)
      const firstCall = kubeConfig.load.mock.calls[0]
      expect(firstCall).toHaveLength(2)
      const { signal } = firstCall[1]
      expect(signal.aborted).toBe(false)
      kubeClient.abortWatcher()
      expect(signal.aborted).toBe(true)
    })
  })
})
