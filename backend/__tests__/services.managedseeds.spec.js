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
  beforeEach,
} from 'vitest'

vi.mock('../lib/cache/index.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    default: {
      ...original.default,
      getManagedSeedsInGardenNamespace: vi.fn(),
    },
    getManagedSeedsInGardenNamespace: vi.fn(),
  }
})

vi.mock('../lib/services/authorization.js', () => ({
  canListManagedSeedsInGardenNamespace: vi.fn(),
}))

const httpErrorsMod = await import('http-errors')
const httpErrors = httpErrorsMod.default
const cacheMod = await import('../lib/cache/index.js')
const cache = cacheMod.default
const authorization = await import('../lib/services/authorization.js')
const managedseeds = await import('../lib/services/managedseeds.js')

describe('services/managedseeds', () => {
  const user = { id: 'admin@example.org' }

  beforeEach(() => {
    vi.resetAllMocks()
    authorization.canListManagedSeedsInGardenNamespace.mockResolvedValue(true)
  })

  it('should reject non-garden namespaces', async () => {
    await expect(managedseeds.list({ user, namespace: 'garden-foo' })).rejects.toThrow(httpErrors.UnprocessableEntity)
    expect(authorization.canListManagedSeedsInGardenNamespace).not.toHaveBeenCalled()
    expect(cache.getManagedSeedsInGardenNamespace).not.toHaveBeenCalled()
  })

  it('should reject unauthorized users', async () => {
    authorization.canListManagedSeedsInGardenNamespace.mockResolvedValue(false)

    await expect(managedseeds.list({ user, namespace: 'garden' })).rejects.toEqual(expect.objectContaining({
      statusCode: 403,
      message: 'You are not allowed to list managed seeds in the garden namespace',
    }))

    expect(authorization.canListManagedSeedsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(cache.getManagedSeedsInGardenNamespace).not.toHaveBeenCalled()
  })

  it('should return simplified managed seeds for the garden namespace', async () => {
    cache.getManagedSeedsInGardenNamespace.mockReturnValue([
      {
        metadata: {
          name: 'infra1-seed',
          namespace: 'garden',
          uid: 'managedseed-1',
          annotations: {
            foo: 'bar',
          },
        },
        spec: {
          shoot: {
            name: 'infra1-shoot',
          },
        },
        status: {
          lastOperation: {
            state: 'Succeeded',
            type: 'Reconcile',
          },
        },
      },
    ])

    const result = await managedseeds.list({ user, namespace: 'garden' })

    expect(authorization.canListManagedSeedsInGardenNamespace).toHaveBeenCalledWith(user)
    expect(cache.getManagedSeedsInGardenNamespace).toHaveBeenCalledTimes(1)
    expect(result).toEqual([
      {
        metadata: {
          name: 'infra1-seed',
          namespace: 'garden',
          uid: 'managedseed-1',
        },
        spec: {
          shoot: {
            name: 'infra1-shoot',
          },
        },
      },
    ])
  })
})
