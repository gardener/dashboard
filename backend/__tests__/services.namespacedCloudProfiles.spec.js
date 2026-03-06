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
  afterEach,
} from 'vitest'
import { cloneDeep } from 'lodash-es'
import * as jsondiffpatch from 'jsondiffpatch'

const cloudProfileList = [
  {
    metadata: {
      name: 'local',
      uid: 1,
    },
    spec: {
      type: 'local',
      kubernetes: {
        versions: [
          { version: '1.30.0' },
          { version: '1.29.0' },
        ],
      },
      machineImages: [
        { name: 'ubuntu', versions: [{ version: '20.04' }] },
      ],
      providerConfig: {
        someProviderSpecificField: 'value',
      },
    },
  },
  {
    metadata: {
      name: 'infra1-profileName',
      uid: 2,
    },
    spec: {
      type: 'infra1',
      kubernetes: {
        versions: [
          { version: '1.30.0' },
        ],
      },
      machineTypes: [
        { name: 'm5.large', cpu: '2', memory: '8Gi' },
      ],
      providerConfig: {
        anotherProviderField: 'other-value',
      },
    },
  },
  {
    metadata: {
      name: 'infra2-profileName',
      uid: 3,
    },
    spec: {
      type: 'infra2',
      kubernetes: {
        versions: [
          { version: '1.28.0' },
        ],
      },
    },
  },
]

const namespacedCloudProfileList = [
  {
    kind: 'NamespacedCloudProfile',
    metadata: {
      name: 'custom-cloudprofile-1',
      namespace: 'garden-local',
      uid: 1001,
    },
    spec: {
      parent: {
        kind: 'CloudProfile',
        name: 'local',
      },
    },
    status: {
      cloudProfileSpec: {
        type: 'local',
        kubernetes: {
          versions: [
            { version: '1.31.1' },  // Added version compared to parent
            { version: '1.30.0' },
            { version: '1.29.0' },
          ],
        },
        machineImages: [
          { name: 'ubuntu', versions: [{ version: '20.04' }] },
        ],
        providerConfig: {
          someProviderSpecificField: 'value',
        },
      },
    },
  },
  {
    kind: 'NamespacedCloudProfile',
    metadata: {
      name: 'custom-cloudprofile-2',
      namespace: 'garden-local',
      uid: 1002,
    },
    spec: {
      parent: {
        kind: 'CloudProfile',
        name: 'infra1-profileName',
      },
    },
    status: {
      cloudProfileSpec: {
        type: 'infra1',
        kubernetes: {
          versions: [
            { version: '1.31.1' },  // Changed version compared to parent
          ],
        },
        machineTypes: [
          { name: 'm5.large', cpu: '2', memory: '8Gi' },
          { name: 'm5.xlarge', cpu: '4', memory: '16Gi' },  // Added machine type
        ],
        providerConfig: {
          anotherProviderField: 'other-value',
        },
      },
    },
  },
  {
    kind: 'NamespacedCloudProfile',
    metadata: {
      name: 'custom-cloudprofile-3',
      namespace: 'garden-dev',
      uid: 1003,
    },
    spec: {
      parent: {
        kind: 'CloudProfile',
        name: 'infra2-profileName',
      },
    },
    status: {
      cloudProfileSpec: {
        type: 'infra2',
        kubernetes: {
          versions: [
            { version: '1.28.0' },
          ],
        },
      },
    },
  },
]

vi.mock('../lib/cache/index.js', () => ({
  default: {
    getNamespacedCloudProfiles: vi.fn((namespace) => {
      const items = cloneDeep(namespacedCloudProfileList)
      if (namespace) {
        return items.filter(item => item.metadata.namespace === namespace)
      }
      return items
    }),
    getCloudProfile: vi.fn((name) => {
      const profile = cloudProfileList.find(p => p.metadata.name === name)
      return profile ? cloneDeep(profile) : undefined
    }),
  },
}))

vi.mock('../lib/services/authorization.js', () => ({
  canListNamespacedCloudProfiles: vi.fn(),
}))

describe('services/namespacedCloudProfiles', () => {
  let namespacedCloudProfiles
  let authorization
  let cache
  let Forbidden

  beforeEach(async () => {
    const httpErrors = await import('http-errors')
    Forbidden = httpErrors.default.Forbidden

    const authModule = await import('../lib/services/authorization.js')
    authorization = authModule

    const cacheModule = await import('../lib/cache/index.js')
    cache = cacheModule.default

    const namespacedCloudProfilesModule = await import('../lib/services/namespacedCloudProfiles.js')
    namespacedCloudProfiles = namespacedCloudProfilesModule
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createUser = (username) => {
    return {
      id: username,
      type: 'email',
    }
  }

  describe('#listForNamespace', () => {
    it('should return namespaced cloudprofiles for a namespace when user is authorized', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)

      const result = await namespacedCloudProfiles.listForNamespace({ user, namespace })

      expect(authorization.canListNamespacedCloudProfiles).toHaveBeenCalledWith(user, namespace)
      expect(result).toHaveLength(2)
      expect(result[0].metadata.name).toBe('custom-cloudprofile-1')
      expect(result[1].metadata.name).toBe('custom-cloudprofile-2')
    })

    it('should throw Forbidden error when user is not authorized', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(false)

      const promise = namespacedCloudProfiles.listForNamespace({ user, namespace })

      await expect(promise).rejects.toThrow(Forbidden)
      await expect(promise).rejects.toThrow(`You are not allowed to list namespaced cloudprofiles in namespace ${namespace}`)

      expect(authorization.canListNamespacedCloudProfiles).toHaveBeenCalledWith(user, namespace)
    })
  })

  describe('#diff functionality', () => {
    it('should return full cloudProfileSpec when diff=false', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)

      const result = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: false })

      expect(result).toHaveLength(2)
      expect(result[0].status.cloudProfileSpec).toBeDefined()
      expect(result[0].status.cloudProfileSpecDiff).toBeUndefined()
    })

    it('should return cloudProfileSpecDiff when diff=true', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)

      const result = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: true })

      expect(result).toHaveLength(2)
      expect(result[0].status.cloudProfileSpec).toBeUndefined()
      expect(result[0].status.cloudProfileSpecDiff).toBeDefined()
    })

    it('should be able to reconstruct original status by applying diff to parent spec', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      const { simplifyCloudProfile } = await import('../lib/utils/index.js')

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const fullResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: false })

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const diffResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: true })

      for (let i = 0; i < fullResult.length; i++) {
        const fullProfile = fullResult[i]
        const diffProfile = diffResult[i]

        const parentName = fullProfile.spec.parent.name
        const parentCloudProfile = cache.getCloudProfile(parentName)

        const simplifiedParent = simplifyCloudProfile(cloneDeep(parentCloudProfile))
        const parentSpec = simplifiedParent.spec

        const reconstructedSpec = jsondiffpatch.patch(cloneDeep(parentSpec), diffProfile.status.cloudProfileSpecDiff)
        const expectedSpec = fullProfile.status.cloudProfileSpec

        expect(reconstructedSpec).toEqual(expectedSpec)
      }
    })

    it('should return null diff when parent profile is identical to namespaced spec', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-dev'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const diffResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: true })

      expect(diffResult).toHaveLength(1)
      expect(diffResult[0].status.cloudProfileSpecDiff).toBeNull() // null means no diff
    })

    it('should handle providerConfig according to simplifyCloudProfile rules', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const diffResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: true })

      const diff = diffResult[0].status.cloudProfileSpecDiff

      expect(diff).toBeDefined()
      if (diff) {
        expect(diff.providerConfig).toBeUndefined()
      }
    })

    it('should correctly diff kubernetes versions array changes', async () => {
      const user = createUser('foo@example.org')
      const namespace = 'garden-local'

      const { simplifyCloudProfile } = await import('../lib/utils/index.js')

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const fullResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: false })

      authorization.canListNamespacedCloudProfiles.mockResolvedValueOnce(true)
      const diffResult = await namespacedCloudProfiles.listForNamespace({ user, namespace, diff: true })

      const profile1Diff = diffResult[0].status.cloudProfileSpecDiff
      expect(profile1Diff).toBeDefined()
      expect(profile1Diff.kubernetes).toBeDefined()
      expect(profile1Diff.kubernetes.versions).toBeDefined()

      const parentName = fullResult[0].spec.parent.name
      const parentCloudProfile = cache.getCloudProfile(parentName)
      const simplifiedParent = simplifyCloudProfile(cloneDeep(parentCloudProfile))
      const parentSpec = simplifiedParent.spec

      const reconstructed = jsondiffpatch.patch(cloneDeep(parentSpec), profile1Diff)
      const expected = fullResult[0].status.cloudProfileSpec

      expect(reconstructed).toEqual(expected)
    })
  })
})
