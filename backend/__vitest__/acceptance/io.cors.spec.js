//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  afterEach,
} from 'vitest'
import request from '@gardener-dashboard/request'
import cache from '../../lib/cache/index.js'
import config from '../../lib/config/index.js'

const { mockRequest } = request

describe('cors', () => {
  let agent
  let socket
  const ioConfig = config.io

  const username = 'foo@example.org'
  const user = fixtures.auth.createUser({
    id: username,
  })

  afterEach(async () => {
    Object.defineProperty(config, 'io', { value: ioConfig })
  })
  afterEach(async () => {
    await socket?.destroy()
    await agent?.close()
    vi.clearAllMocks()
  })

  it('should reject connections if no origins are configured', async () => {
    Object.defineProperty(config, 'websocketAllowedOrigins', { value: [] })
    mockRequest
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    await expect(createAgent('io', cache))
      .rejects.toThrow('WebSocket allowed origins configuration is required')
  })

  it('should reject connections from disallowed origins', async () => {
    Object.defineProperty(config, 'websocketAllowedOrigins', { value: ['https://allowed.example.org'] })
    mockRequest
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    agent = await createAgent('io', cache)
    const cookie = await user.cookie
    await expect(
      agent.connect({ cookie, originHeader: 'https://forbidden.example.org' }),
    ).rejects.toThrow(/websocket error/i)
  })

  it('should reject connections without origin', async () => {
    Object.defineProperty(config, 'websocketAllowedOrigins', { value: ['https://allowed.example.org'] })
    mockRequest
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    agent = await createAgent('io', cache)
    const cookie = await user.cookie
    await expect(
      agent.connect({ cookie }),
    ).rejects.toThrow(/websocket error/i)
  })

  it('should allow connections from allowed origins', async () => {
    Object.defineProperty(config, 'websocketAllowedOrigins', { value: ['https://allowed.example.org'] })
    mockRequest
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    agent = await createAgent('io', cache)
    const cookie = await user.cookie
    socket = await agent.connect({ cookie, originHeader: 'https://allowed.example.org' })
    expect(socket.connected).toBe(true)
  })

  it('should allow connections when "*" is configured', async () => {
    Object.defineProperty(config, 'websocketAllowedOrigins', { value: ['*'] })
    mockRequest
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    agent = await createAgent('io', cache)
    const cookie = await user.cookie
    socket = await agent.connect({ cookie, originHeader: 'https://any.example.org' })
    expect(socket.connected).toBe(true)
  })
})
