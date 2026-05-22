//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const ENV_NAMES = {
  readIdleTimeout: 'KUBE_CLIENT_READ_IDLE_TIMEOUT',
  pingTimeout: 'KUBE_CLIENT_PING_TIMEOUT',
}
const originalEnv = Object.fromEntries(
  Object.values(ENV_NAMES).map(envName => [envName, process.env[envName]]),
)

async function importKubeClientWithEnv ({
  readIdleTimeout,
  pingTimeout,
} = {}) {
  vi.resetModules()
  setEnv(ENV_NAMES.readIdleTimeout, readIdleTimeout)
  setEnv(ENV_NAMES.pingTimeout, pingTimeout)

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
      readIdleTimeout: 30000,
      pingTimeout: 15000,
    })
  })

  it('should apply kube client heartbeat environment variables to user clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '1234',
      pingTimeout: '5678',
    })

    request.extend.mockClear()
    kubeClient.createClient({ auth: { bearer: 'bearer' } })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 1234,
      pingTimeout: 5678,
    })
  })

  it('should apply kube client heartbeat environment variables to dashboard clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '2345',
      pingTimeout: '6789',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient()

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 2345,
      pingTimeout: 6789,
    })
  })

  it('should allow per-client options to override kube client heartbeat environment variables', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '3456',
      pingTimeout: '7890',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: 6543,
      pingTimeout: 9870,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 6543,
      pingTimeout: 9870,
    })
  })

  it('should allow per-client heartbeat option 0 to override kube client heartbeat environment variables', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '4567',
      pingTimeout: '8901',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: 0,
      pingTimeout: 0,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 0,
      pingTimeout: 0,
    })
  })

  it('should allow kube client heartbeat environment variable 0 to disable heartbeat timers', async () => {
    expect.hasAssertions()
    const { request } = await importKubeClientWithEnv({
      readIdleTimeout: '0',
      pingTimeout: '0',
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 0,
      pingTimeout: 0,
    })
  })

  it('should ignore explicit undefined heartbeat options when applying kube client heartbeat defaults', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '5678',
      pingTimeout: '9012',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      readIdleTimeout: undefined,
      pingTimeout: undefined,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 5678,
      pingTimeout: 9012,
    })
  })

  it.each(['readIdleTimeout', 'pingTimeout'])('should fail fast for invalid per-client %s option', async optionName => {
    expect.hasAssertions()
    const { kubeClient } = await importKubeClientWithEnv()

    for (const value of ['foo', -1, 1.5, 2147483648, '']) {
      expect(() => kubeClient.createDashboardClient({
        [optionName]: value,
      })).toThrow(`${optionName} must be a non-negative integer <= 2147483647`)
    }
  })

  it('should apply kube client heartbeat defaults to derived kubeconfig clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '6789',
      pingTimeout: '1234',
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
