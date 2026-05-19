//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const ENV_NAMES = {
  readIdleTimeout: 'KUBE_CLIENT_READ_IDLE_TIMEOUT',
  pingTimeout: 'KUBE_CLIENT_PING_TIMEOUT',
  requestTimeout: 'KUBE_CLIENT_REQUEST_TIMEOUT',
}
const originalEnv = Object.fromEntries(
  Object.values(ENV_NAMES).map(envName => [envName, process.env[envName]]),
)

async function importKubeClientWithEnv ({
  readIdleTimeout,
  pingTimeout,
  requestTimeout,
} = {}) {
  vi.resetModules()
  setEnv(ENV_NAMES.readIdleTimeout, readIdleTimeout)
  setEnv(ENV_NAMES.pingTimeout, pingTimeout)
  setEnv(ENV_NAMES.requestTimeout, requestTimeout)

  const { default: kubeClient } = await import('../lib/index.js')
  const { default: request } = await import('@gardener-dashboard/request')
  return { kubeClient, request }
}

function setEnv (envName, value) {
  if (value === undefined) {
    delete process.env[envName]
  } else {
    process.env[envName] = value
  }
}

function restoreEnv () {
  for (const [envName, value] of Object.entries(originalEnv)) {
    setEnv(envName, value)
  }
}

function transportOptionsFromExtendCalls (request) {
  return request.extend.mock.calls.map(([clientConfig]) => ({
    readIdleTimeout: clientConfig.readIdleTimeout,
    pingTimeout: clientConfig.pingTimeout,
    requestTimeout: clientConfig.requestTimeout,
  }))
}

function expectAllClientsToUseTransportOptions (request, expectedOptions) {
  expect(request.extend).toHaveBeenCalled()
  expect(new Set(
    transportOptionsFromExtendCalls(request).map(options => JSON.stringify(options)),
  )).toEqual(new Set([JSON.stringify(expectedOptions)]))
}

describe('kube-client package defaults', () => {
  afterEach(() => {
    restoreEnv()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should apply default heartbeat options to the package-level dashboard client', async () => {
    expect.hasAssertions()
    const { request } = await importKubeClientWithEnv()

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 30_000,
      pingTimeout: 15_000,
      requestTimeout: 5 * 60 * 1_000,
    })
  })

  it('should apply kube client environment variables to user clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '1234',
      pingTimeout: '5678',
      requestTimeout: '9012',
    })

    request.extend.mockClear()
    kubeClient.createClient({ auth: { bearer: 'bearer' } })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 1234,
      pingTimeout: 5678,
      requestTimeout: 9012,
    })
  })

  it('should apply kube client environment variables to dashboard clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '2345',
      pingTimeout: '6789',
      requestTimeout: '1023',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient()

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 2345,
      pingTimeout: 6789,
      requestTimeout: 1023,
    })
  })

  it('should allow per-client options to override kube client environment variables', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '3456',
      pingTimeout: '7890',
      requestTimeout: '1234',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: 6543,
      pingTimeout: 9870,
      requestTimeout: 4321,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 6543,
      pingTimeout: 9870,
      requestTimeout: 4321,
    })
  })

  it('should allow per-client option 0 to override kube client environment variables', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '4567',
      pingTimeout: '8901',
      requestTimeout: '2345',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: 0,
      pingTimeout: 0,
      requestTimeout: 0,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 0,
      pingTimeout: 0,
      requestTimeout: 0,
    })
  })

  it('should allow kube client environment variable 0 to disable the corresponding timer', async () => {
    expect.hasAssertions()
    const { request } = await importKubeClientWithEnv({
      readIdleTimeout: '0',
      pingTimeout: '0',
      requestTimeout: '0',
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 0,
      pingTimeout: 0,
      requestTimeout: 0,
    })
  })

  it('should ignore explicit undefined options when applying kube client defaults', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '5678',
      pingTimeout: '9012',
      requestTimeout: '3456',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: undefined,
      pingTimeout: undefined,
      requestTimeout: undefined,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 5678,
      pingTimeout: 9012,
      requestTimeout: 3456,
    })
  })

  it.each(['readIdleTimeout', 'pingTimeout', 'requestTimeout'])('should fail fast for invalid per-client %s option', async optionName => {
    expect.hasAssertions()
    const { kubeClient } = await importKubeClientWithEnv()

    for (const value of ['foo', -1, 1.5, 2147483648, '']) {
      expect(() => kubeClient.createDashboardClient({
        [optionName]: value,
      })).toThrow(`${optionName} must be a non-negative integer <= 2147483647`)
    }
  })

  it('should apply kube client defaults to derived kubeconfig clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '6789',
      pingTimeout: '1234',
      requestTimeout: '5432',
    })
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

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 6789,
      pingTimeout: 1234,
      requestTimeout: 5432,
    })
  })

  it.each(Object.values(ENV_NAMES))('should fail fast for invalid %s value', async envName => {
    expect.hasAssertions()
    for (const value of ['foo', '-1', '1.5', '2147483648']) {
      vi.resetModules()
      restoreEnv()
      setEnv(envName, value)

      await expect(import('../lib/index.js')).rejects.toThrow(
        `${envName} must be a non-negative integer <= 2147483647`,
      )
    }
  })
})
