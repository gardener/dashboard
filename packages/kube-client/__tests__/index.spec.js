//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const ENV_NAME = 'KUBE_CLIENT_REQUEST_TIMEOUT'
const originalRequestTimeout = process.env[ENV_NAME]

async function importKubeClientWithEnv (value) {
  vi.resetModules()
  if (value === undefined) {
    delete process.env[ENV_NAME]
  } else {
    process.env[ENV_NAME] = value
  }

  const { default: kubeClient } = await import('../lib/index.js')
  const { default: request } = await import('@gardener-dashboard/request')
  return { kubeClient, request }
}

function requestTimeoutsFromExtendCalls (request) {
  return request.extend.mock.calls.map(([clientConfig]) => clientConfig.requestTimeout)
}

function expectAllClientsToUseRequestTimeout (request, requestTimeout) {
  expect(request.extend).toHaveBeenCalled()
  expect(requestTimeoutsFromExtendCalls(request)).toEqual(
    expect.arrayContaining([requestTimeout]),
  )
  expect(new Set(requestTimeoutsFromExtendCalls(request))).toEqual(new Set([requestTimeout]))
}

describe('kube-client package defaults', () => {
  afterEach(() => {
    if (originalRequestTimeout === undefined) {
      delete process.env[ENV_NAME]
    } else {
      process.env[ENV_NAME] = originalRequestTimeout
    }
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should apply KUBE_CLIENT_REQUEST_TIMEOUT to the package-level dashboard client', async () => {
    expect.hasAssertions()
    const { request } = await importKubeClientWithEnv('1234')

    expectAllClientsToUseRequestTimeout(request, 1234)
  })

  it('should apply KUBE_CLIENT_REQUEST_TIMEOUT to user clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('2345')

    request.extend.mockClear()
    kubeClient.createClient({ auth: { bearer: 'bearer' } })

    expectAllClientsToUseRequestTimeout(request, 2345)
  })

  it('should apply KUBE_CLIENT_REQUEST_TIMEOUT to dashboard clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('3456')

    request.extend.mockClear()
    kubeClient.createDashboardClient()

    expectAllClientsToUseRequestTimeout(request, 3456)
  })

  it('should allow per-client options to override KUBE_CLIENT_REQUEST_TIMEOUT', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('4567')

    request.extend.mockClear()
    kubeClient.createDashboardClient({ requestTimeout: 7654 })

    expectAllClientsToUseRequestTimeout(request, 7654)
  })

  it('should allow per-client requestTimeout 0 to override KUBE_CLIENT_REQUEST_TIMEOUT', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('4567')

    request.extend.mockClear()
    kubeClient.createDashboardClient({ requestTimeout: 0 })

    expectAllClientsToUseRequestTimeout(request, 0)
  })

  it('should ignore explicit undefined requestTimeout options when applying KUBE_CLIENT_REQUEST_TIMEOUT', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('4567')

    request.extend.mockClear()
    kubeClient.createDashboardClient({ requestTimeout: undefined })

    expectAllClientsToUseRequestTimeout(request, 4567)
  })

  it('should apply KUBE_CLIENT_REQUEST_TIMEOUT to derived kubeconfig clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv('5678')
    const { default: helper } = await import('./fixtures/helper.js')
    const client = kubeClient.createDashboardClient()
    const getSecretStub = vi.spyOn(client.core.secrets, 'get')
    const testKubeconfig = helper.createTestKubeconfig({ token: 'bearer' }, { server: 'https://kubernetes:6443' })
    getSecretStub.mockReturnValue({
      data: {
        kubeconfig: Buffer.from(testKubeconfig.toYAML()).toString('base64'),
      },
    })

    request.extend.mockClear()
    await client.createKubeconfigClient({ namespace: 'namespace', name: 'name' })

    expectAllClientsToUseRequestTimeout(request, 5678)
  })

  it('should allow KUBE_CLIENT_REQUEST_TIMEOUT 0 to disable request timeouts', async () => {
    expect.hasAssertions()
    const { request } = await importKubeClientWithEnv('0')

    expectAllClientsToUseRequestTimeout(request, 0)
  })

  it.each(['foo', '-1', '1.5', '2147483648'])('should fail fast for invalid KUBE_CLIENT_REQUEST_TIMEOUT value %s', async value => {
    vi.resetModules()
    process.env[ENV_NAME] = value

    await expect(import('../lib/index.js')).rejects.toThrow(
      'KUBE_CLIENT_REQUEST_TIMEOUT must be a non-negative integer <= 2147483647',
    )
  })
})
