//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('../dist/lib/cache', () => ({
  getManagedSeedsInGardenNamespace: jest.fn(),
  getShoot: jest.fn(),
}))

jest.mock('../dist/lib/services/authorization', () => ({
  canListManagedSeedsInGardenNamespace: jest.fn(),
  canListShootsInGardenNamespace: jest.fn(),
}))

describe('services/managedseedshoots', () => {
  const httpErrors = require('http-errors')
  const cache = require('../dist/lib/cache')
  const authorization = require('../dist/lib/services/authorization')
  const managedseedshoots = require('../dist/lib/services/managedseedshoots')

  const user = { id: 'admin@example.org' }

  beforeEach(() => {
    jest.resetAllMocks()
    authorization.canListManagedSeedsInGardenNamespace.mockResolvedValue(true)
    authorization.canListShootsInGardenNamespace.mockResolvedValue(true)
  })

  it('should reject non-garden namespaces', async () => {
    await expect(managedseedshoots.list({ user, namespace: 'garden-foo' })).rejects.toThrow(httpErrors.UnprocessableEntity)
    expect(authorization.canListManagedSeedsInGardenNamespace).not.toHaveBeenCalled()
    expect(authorization.canListShootsInGardenNamespace).not.toHaveBeenCalled()
  })

  it('should reject unauthorized users', async () => {
    authorization.canListManagedSeedsInGardenNamespace.mockResolvedValue(false)

    await expect(managedseedshoots.list({ user, namespace: 'garden' })).rejects.toEqual(expect.objectContaining({
      statusCode: 403,
      message: 'You are not allowed to list managed seed shoots in the garden namespace',
    }))

    expect(authorization.canListManagedSeedsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(authorization.canListShootsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(cache.getManagedSeedsInGardenNamespace).not.toHaveBeenCalled()
  })

  it('should return managed seed shoots for the garden namespace', async () => {
    cache.getManagedSeedsInGardenNamespace.mockReturnValue([
      {
        metadata: {
          name: 'infra1-seed',
          namespace: 'garden',
          uid: 'managedseed-1',
        },
        spec: {
          shoot: {
            name: 'infra1-seed',
          },
        },
      },
      {
        metadata: {
          name: 'without-shoot-name',
          namespace: 'garden',
          uid: 'managedseed-2',
        },
        spec: {},
      },
      {
        metadata: {
          name: 'missing-shoot',
          namespace: 'garden',
          uid: 'managedseed-3',
        },
        spec: {
          shoot: {
            name: 'missing-shoot',
          },
        },
      },
    ])
    cache.getShoot.mockImplementation((namespace, name) => {
      if (namespace === 'garden' && name === 'infra1-seed') {
        return {
          metadata: {
            name,
            namespace,
            uid: 'shoot-1',
          },
          status: {
            conditions: [{ type: 'APIServerAvailable', status: 'True' }],
          },
        }
      }
    })

    const result = await managedseedshoots.list({ user, namespace: 'garden' })

    expect(authorization.canListManagedSeedsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(authorization.canListShootsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(cache.getManagedSeedsInGardenNamespace).toHaveBeenCalledTimes(1)
    expect(cache.getShoot).toHaveBeenCalledWith('garden', 'infra1-seed')
    expect(cache.getShoot).toHaveBeenCalledWith('garden', 'missing-shoot')
    expect(result).toEqual([
      {
        metadata: {
          name: 'infra1-seed',
          namespace: 'garden',
          uid: 'shoot-1',
        },
        status: {
          conditions: [{ type: 'APIServerAvailable', status: 'True' }],
        },
      },
    ])
  })
})
