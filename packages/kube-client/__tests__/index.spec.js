//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const ENV_NAMES = {
  readIdleTimeout: 'KUBE_CLIENT_READ_IDLE_TIMEOUT',
  pingTimeout: 'KUBE_CLIENT_PING_TIMEOUT',
  requestTimeout: 'KUBE_CLIENT_REQUEST_TIMEOUT',
  initialWindowSize: 'KUBE_CLIENT_INITIAL_WINDOW_SIZE',
  connectionWindowSize: 'KUBE_CLIENT_CONNECTION_WINDOW_SIZE',
  maxSessionMemory: 'KUBE_CLIENT_MAX_SESSION_MEMORY',
}
const originalEnv = Object.fromEntries(
  Object.values(ENV_NAMES).map(envName => [envName, process.env[envName]]),
)

async function importKubeClientWithEnv ({
  readIdleTimeout,
  pingTimeout,
  requestTimeout,
  initialWindowSize,
  connectionWindowSize,
  maxSessionMemory,
} = {}) {
  vi.resetModules()
  setEnv(ENV_NAMES.readIdleTimeout, readIdleTimeout)
  setEnv(ENV_NAMES.pingTimeout, pingTimeout)
  setEnv(ENV_NAMES.requestTimeout, requestTimeout)
  setEnv(ENV_NAMES.initialWindowSize, initialWindowSize)
  setEnv(ENV_NAMES.connectionWindowSize, connectionWindowSize)
  setEnv(ENV_NAMES.maxSessionMemory, maxSessionMemory)

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
    settings: clientConfig.settings,
    connectionWindowSize: clientConfig.connectionWindowSize,
    maxSessionMemory: clientConfig.maxSessionMemory,
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

  it('should apply kube client HTTP/2 environment variables to all clients', async () => {
    expect.hasAssertions()
    const environment = {
      initialWindowSize: '1048576',
      connectionWindowSize: '16777216',
      maxSessionMemory: '64',
    }
    const expectedOptions = {
      readIdleTimeout: 30_000,
      pingTimeout: 15_000,
      requestTimeout: 5 * 60 * 1_000,
      settings: { initialWindowSize: 1048576 },
      connectionWindowSize: 16777216,
      maxSessionMemory: 64,
    }
    const { kubeClient, request } = await importKubeClientWithEnv(environment)

    expectAllClientsToUseTransportOptions(request, expectedOptions)

    request.extend.mockClear()
    kubeClient.createClient({ auth: { bearer: 'bearer' } })
    kubeClient.createDashboardClient()

    expectAllClientsToUseTransportOptions(request, expectedOptions)
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

  it('should allow per-client HTTP/2 options to override kube client environment variables', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      initialWindowSize: '1048576',
      connectionWindowSize: '16777216',
      maxSessionMemory: '64',
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({
      settings: { enablePush: false, initialWindowSize: 2097152 },
      connectionWindowSize: 33554432,
      maxSessionMemory: 128,
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 30_000,
      pingTimeout: 15_000,
      requestTimeout: 5 * 60 * 1_000,
      settings: { enablePush: false, initialWindowSize: 2097152 },
      connectionWindowSize: 33554432,
      maxSessionMemory: 128,
    })
  })

  it('should accept the maximum HTTP/2 maxSessionMemory value', async () => {
    expect.hasAssertions()
    const maxSessionMemory = 2 ** 32 - 1
    const { kubeClient, request } = await importKubeClientWithEnv({
      maxSessionMemory: String(maxSessionMemory),
    })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 30_000,
      pingTimeout: 15_000,
      requestTimeout: 5 * 60 * 1_000,
      maxSessionMemory,
    })

    request.extend.mockClear()
    kubeClient.createDashboardClient({ maxSessionMemory })

    expectAllClientsToUseTransportOptions(request, {
      readIdleTimeout: 30_000,
      pingTimeout: 15_000,
      requestTimeout: 5 * 60 * 1_000,
      maxSessionMemory,
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

  it.each([
    ['initialWindowSize', [1, 65534, 1.5, 2 ** 31, '1Mi'], 'must be an integer between 65535 and 2147483647'],
    ['connectionWindowSize', [1, 65534, 1.5, 2 ** 31, '1Mi'], 'must be an integer between 65535 and 2147483647'],
    ['maxSessionMemory', [0, 1.5, 2 ** 32, '1Mi'], 'must be an integer between 1 and 4294967295'],
  ])('should fail fast for invalid per-client %s option', async (optionName, values, message) => {
    expect.hasAssertions()
    const { kubeClient } = await importKubeClientWithEnv()

    for (const value of values) {
      expect(() => kubeClient.createDashboardClient({ [optionName]: value })).toThrow(`${optionName} ${message}`)
    }
  })

  it('should apply kube client defaults to derived kubeconfig clients', async () => {
    expect.hasAssertions()
    const { kubeClient, request } = await importKubeClientWithEnv({
      readIdleTimeout: '6789',
      pingTimeout: '1234',
      requestTimeout: '5432',
      initialWindowSize: '1048576',
      connectionWindowSize: '16777216',
      maxSessionMemory: '64',
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
      settings: { initialWindowSize: 1048576 },
      connectionWindowSize: 16777216,
      maxSessionMemory: 64,
    })
  })

  it.each(Object.values(ENV_NAMES))('should fail fast for invalid %s value', async envName => {
    expect.hasAssertions()
    const isTimeout = ['KUBE_CLIENT_READ_IDLE_TIMEOUT', 'KUBE_CLIENT_PING_TIMEOUT', 'KUBE_CLIENT_REQUEST_TIMEOUT'].includes(envName)
    let message = 'must be an integer between 65535 and 2147483647'
    if (isTimeout) {
      message = 'must be a non-negative integer <= 2147483647'
    } else if (envName === 'KUBE_CLIENT_MAX_SESSION_MEMORY') {
      message = 'must be an integer between 1 and 4294967295'
    }
    const values = envName === 'KUBE_CLIENT_MAX_SESSION_MEMORY'
      ? ['foo', '-1', '1.5', '4294967296', '9007199254740992']
      : ['foo', '-1', '1.5', '2147483648']
    for (const value of values) {
      vi.resetModules()
      restoreEnv()
      setEnv(envName, value)

      await expect(import('../lib/index.js')).rejects.toThrow(
        `${envName} ${message}`,
      )
    }
  })
})
