//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'
import { diff as jsondiffpatchDiff } from 'jsondiffpatch'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useAppStore } from '@/store/app'

import { useApi } from '@/composables/useApi'
import { firstItemMatchingVersionClassification } from '@/composables/helper'

import { computeSpecHash } from '@/utils/crypto'
import { getCloudProfileSpec } from '@/utils'

describe('stores', () => {
  describe('cloudProfile', () => {
    const namespace = 'default'

    let authzStore
    let configStore
    let cloudProfileStore

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01'))
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    beforeEach(async () => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace(namespace)
      configStore = useConfigStore()
      configStore.setConfiguration({
        defaultNodesCIDR: '10.10.0.0/16',
        vendorHints: [{
          type: 'warning',
          message: 'test',
          matchNames: ['gardenlinux'],
        }],
      })
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.setCloudProfiles([])
    })

    describe('cloudProfileByRef', () => {
      beforeEach(async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
          {
            kind: 'CloudProfile',
            metadata: { name: 'gcp' },
            spec: { type: 'gcp' },
          },
        ])
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-dev' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-dev')
      })

      it('should resolve a CloudProfile ref', () => {
        const result = cloudProfileStore.cloudProfileByRef({ kind: 'CloudProfile', name: 'aws' })
        expect(result).toBeDefined()
        expect(result.metadata.name).toBe('aws')
      })

      it('should resolve a NamespacedCloudProfile ref with namespace', () => {
        const result = cloudProfileStore.cloudProfileByRef({
          kind: 'NamespacedCloudProfile',
          name: 'custom-aws',
          namespace: 'garden-local',
        })
        expect(result).toBeDefined()
        expect(result.metadata.name).toBe('custom-aws')
        expect(result.metadata.namespace).toBe('garden-local')
      })

      it('should resolve a NamespacedCloudProfile ref without namespace (fallback)', () => {
        const result = cloudProfileStore.cloudProfileByRef({
          kind: 'NamespacedCloudProfile',
          name: 'custom-gcp',
        })
        expect(result).toBeDefined()
        expect(result.metadata.name).toBe('custom-gcp')
      })

      it('should return null for ambiguous NamespacedCloudProfile ref without namespace', async () => {
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-local')
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-dev' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-dev')

        const result = cloudProfileStore.cloudProfileByRef({
          kind: 'NamespacedCloudProfile',
          name: 'custom-gcp',
        })
        expect(result).toBeNull()
      })

      it('should return null for unknown ref', () => {
        expect(cloudProfileStore.cloudProfileByRef({ kind: 'CloudProfile', name: 'unknown' })).toBeNull()
        expect(cloudProfileStore.cloudProfileByRef({ kind: 'NamespacedCloudProfile', name: 'unknown' })).toBeNull()
      })

      it('should return null for null or undefined ref', () => {
        expect(cloudProfileStore.cloudProfileByRef(null)).toBeNull()
        expect(cloudProfileStore.cloudProfileByRef(undefined)).toBeNull()
      })

      it('should return null for unknown kind', () => {
        expect(cloudProfileStore.cloudProfileByRef({ kind: 'Unknown', name: 'aws' })).toBeNull()
      })
    })

    describe('namespaced cloud profile cache', () => {
      beforeEach(() => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
          {
            kind: 'CloudProfile',
            metadata: { name: 'gcp' },
            spec: { type: 'gcp' },
          },
        ])
      })

      it('should aggregate namespaced cloud profiles across multiple namespaces', async () => {
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')

        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-dev' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-dev')

        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(2)
        expect(cloudProfileStore.hasNamespacedCloudProfilesForNamespace('garden-local')).toBe(true)
        expect(cloudProfileStore.hasNamespacedCloudProfilesForNamespace('garden-dev')).toBe(true)
      })

      it('should resolve namespaced cloud profile refs across multiple cached namespaces', async () => {
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-dev' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-dev')

        expect(cloudProfileStore.cloudProfileByRef({
          kind: 'NamespacedCloudProfile',
          name: 'custom-gcp',
          namespace: 'garden-dev',
        })?.metadata.namespace).toBe('garden-dev')
      })
    })

    describe('cloudProfilesByProviderType', () => {
      beforeEach(async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
        ])
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-dev' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-dev')
      })

      it('should return both regular and namespaced profiles for a provider type', () => {
        const profiles = cloudProfileStore.cloudProfilesByProviderType('aws')
        expect(profiles).toHaveLength(2)
        expect(profiles[0].metadata.name).toBe('aws')
        expect(profiles[1].metadata.name).toBe('custom-aws')
      })

      it('should return only namespaced profiles when no regular profiles match', () => {
        const profiles = cloudProfileStore.cloudProfilesByProviderType('gcp')
        expect(profiles).toHaveLength(1)
        expect(profiles[0].metadata.name).toBe('custom-gcp')
      })

      it('should return empty array for unknown provider type', () => {
        const profiles = cloudProfileStore.cloudProfilesByProviderType('unknown')
        expect(profiles).toHaveLength(0)
      })
    })

    describe('sortedInfraProviderTypeList', () => {
      it('should include provider types from both regular and namespaced profiles', async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
        ])
        await cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-local')
        const providerTypes = cloudProfileStore.sortedInfraProviderTypeList
        expect(providerTypes).toContain('aws')
        expect(providerTypes).toContain('gcp')
      })
    })

    describe('setNamespacedCloudProfiles with rehydration', () => {
      it('should pass through profiles that already have cloudProfileSpec', async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws', kubernetes: { versions: [{ version: '1.30.0' }] } },
          },
        ])
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpec: { type: 'aws', kubernetes: { versions: [{ version: '1.31.0' }] } },
          },
        }
        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(getCloudProfileSpec(stored).kubernetes.versions[0].version).toBe('1.31.0')
      })

      it('should rehydrate profiles with cloudProfileSpecDiff from parent', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: parentSpec,
          },
        ])
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
          },
        }
        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(parentSpec)
        expect(stored.status.cloudProfileSpecDiff).toBeUndefined()
      })

      it('should rehydrate profiles with non-null cloudProfileSpecDiff from parent', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
          machineTypes: [{ name: 'm5.large', cpu: '2', memory: '8Gi' }],
        }
        const namespacedSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.31.0' }] },
          machineTypes: [
            { name: 'm5.large', cpu: '2', memory: '8Gi' },
            { name: 'm5.xlarge', cpu: '4', memory: '16Gi' },
          ],
        }
        const cloudProfileSpecDiff = jsondiffpatchDiff(parentSpec, namespacedSpec)
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: parentSpec,
          },
        ])
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff,
          },
        }
        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(namespacedSpec)
        expect(stored.status.cloudProfileSpecDiff).toBeUndefined()
      })

      it('should skip rehydration when parent is not found', async () => {
        cloudProfileStore.setCloudProfiles([])
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'nonexistent' } },
          status: {
            cloudProfileSpecDiff: null,
          },
        }
        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toBeUndefined()
      })

      it('should rehydrate when hash validates regardless of resourceVersion', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: parentSpec,
          },
        ])
        const expectedHash = await computeSpecHash(parentSpec)
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: expectedHash,
          },
        }
        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(parentSpec)
        expect(stored.status.parentCloudProfileResourceVersion).toBeUndefined()
        expect(stored.status.cloudProfileSpecHash).toBeUndefined()
      })

      it('should not re-fetch parent when hash matches even if resourceVersion differs', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: parentSpec,
          },
        ])
        const expectedHash = await computeSpecHash(parentSpec)

        const api = useApi()
        api.getCloudProfile = vi.fn()

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: expectedHash,
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(api.getCloudProfile).not.toHaveBeenCalled()
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(parentSpec)
      })

      it('should re-fetch parent on hash mismatch when resourceVersion differs and recover', async () => {
        const staleParentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.29.0' }] },
        }
        const freshParentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }

        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: staleParentSpec,
          },
        ])

        const expectedHash = await computeSpecHash(freshParentSpec)

        const api = useApi()
        api.getCloudProfile = vi.fn().mockResolvedValueOnce({
          data: {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: freshParentSpec,
          },
        })

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: expectedHash,
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(api.getCloudProfile).toHaveBeenCalledWith({ name: 'aws' })
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(freshParentSpec)
      })

      it('should drop profile when parent re-fetch fails and show notification', async () => {
        const staleParentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.29.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: staleParentSpec,
          },
        ])

        const api = useApi()
        api.getCloudProfile = vi.fn().mockRejectedValueOnce(new Error('Network error'))

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const appStore = useAppStore()
        const setErrorSpy = vi.spyOn(appStore, 'setError')

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: 'deliberately-wrong-hash',
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(0)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to re-fetch CloudProfile'),
          expect.any(Error),
        )
        expect(setErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Cloud Profile Sync Error',
            text: expect.stringContaining('1 namespaced cloud profile(s)'),
          }),
        )

        consoleErrorSpy.mockRestore()
      })

      it('should drop profile when hash still mismatches after parent re-fetch', async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: { type: 'aws' },
          },
        ])

        const api = useApi()
        api.getCloudProfile = vi.fn().mockResolvedValueOnce({
          data: {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: { type: 'aws', kubernetes: { versions: [{ version: '1.31.0' }] } },
          },
        })

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const appStore = useAppStore()
        const setErrorSpy = vi.spyOn(appStore, 'setError')

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: 'deliberately-wrong-hash',
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(0)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Hash mismatch'),
        )
        expect(setErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Cloud Profile Sync Error',
          }),
        )

        consoleErrorSpy.mockRestore()
      })

      it('should drop profile immediately when hash mismatches and resourceVersion matches', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: parentSpec,
          },
        ])

        const api = useApi()
        api.getCloudProfile = vi.fn()

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const appStore = useAppStore()
        const setErrorSpy = vi.spyOn(appStore, 'setError')

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: 'deliberately-wrong-hash',
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(api.getCloudProfile).not.toHaveBeenCalled()
        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(0)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('ResourceVersion matches, so re-fetch will not help'),
        )
        expect(setErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Cloud Profile Sync Error',
          }),
        )

        consoleErrorSpy.mockRestore()
      })

      it('should re-fetch a stale parent only once when multiple profiles share it', async () => {
        const freshParentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }

        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: { type: 'aws', kubernetes: { versions: [{ version: '1.29.0' }] } },
          },
        ])

        const api = useApi()
        api.getCloudProfile = vi.fn().mockResolvedValueOnce({
          data: {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: freshParentSpec,
          },
        })

        const diff1 = jsondiffpatchDiff(freshParentSpec, {
          ...freshParentSpec,
          machineTypes: [{ name: 'm5.large' }],
        })
        const diff2 = jsondiffpatchDiff(freshParentSpec, {
          ...freshParentSpec,
          machineTypes: [{ name: 'm5.xlarge' }],
        })

        const spec1 = { ...freshParentSpec, machineTypes: [{ name: 'm5.large' }] }
        const spec2 = { ...freshParentSpec, machineTypes: [{ name: 'm5.xlarge' }] }
        const hash1 = await computeSpecHash(spec1)
        const hash2 = await computeSpecHash(spec2)

        const profiles = [
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-1', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: {
              cloudProfileSpecDiff: diff1,
              parentCloudProfileResourceVersion: '42',
              cloudProfileSpecHash: hash1,
            },
          },
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-2', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: {
              cloudProfileSpecDiff: diff2,
              parentCloudProfileResourceVersion: '42',
              cloudProfileSpecHash: hash2,
            },
          },
        ]

        await cloudProfileStore.setNamespacedCloudProfiles(profiles, 'garden-local')

        expect(api.getCloudProfile).toHaveBeenCalledTimes(1)
        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(2)
      })

      it('should not trigger validation for profiles without cloudProfileSpecDiff', async () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '41' },
            spec: { type: 'aws' },
          },
        ])

        const api = useApi()
        api.getCloudProfile = vi.fn()

        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpec: { type: 'aws', kubernetes: { versions: [{ version: '1.31.0' }] } },
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(api.getCloudProfile).not.toHaveBeenCalled()
        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(1)
      })

      it('should not show notification when all profiles rehydrate successfully', async () => {
        const parentSpec = {
          type: 'aws',
          kubernetes: { versions: [{ version: '1.30.0' }] },
        }
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws', resourceVersion: '42' },
            spec: parentSpec,
          },
        ])

        const appStore = useAppStore()
        const setErrorSpy = vi.spyOn(appStore, 'setError')

        const expectedHash = await computeSpecHash(parentSpec)
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
            parentCloudProfileResourceVersion: '42',
            cloudProfileSpecHash: expectedHash,
          },
        }

        await cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')

        expect(cloudProfileStore.namespacedCloudProfileList).toHaveLength(1)
        expect(setErrorSpy).not.toHaveBeenCalled()
      })
    })

    describe('helper', () => {
      describe('#firstItemMatchingVersionClassification', () => {
        it('should select default item that matches version classification', () => {
          const items = [
            {
              version: '1',
              classification: 'deprecated',
            },
            {
              version: '2',
            },
            {
              version: '3',
              classification: 'supported',
            },
          ]

          let item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('3')

          items.pop()
          item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('2')

          items.pop()
          item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('1')
        })
      })
    })
  })
})
