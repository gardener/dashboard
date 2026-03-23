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

import { firstItemMatchingVersionClassification } from '@/composables/helper'

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
        cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        cloudProfileStore.setNamespacedCloudProfiles([
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

      it('should return null for ambiguous NamespacedCloudProfile ref without namespace', () => {
        cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-gcp', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'gcp' } },
            status: { cloudProfileSpec: { type: 'gcp' } },
          },
        ], 'garden-local')
        cloudProfileStore.setNamespacedCloudProfiles([
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

      it('should aggregate namespaced cloud profiles across multiple namespaces', () => {
        cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')

        cloudProfileStore.setNamespacedCloudProfiles([
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

      it('should resolve namespaced cloud profile refs across multiple cached namespaces', () => {
        cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        cloudProfileStore.setNamespacedCloudProfiles([
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
      beforeEach(() => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
        ])
        cloudProfileStore.setNamespacedCloudProfiles([
          {
            kind: 'NamespacedCloudProfile',
            metadata: { name: 'custom-aws', namespace: 'garden-local' },
            spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
            status: { cloudProfileSpec: { type: 'aws' } },
          },
        ], 'garden-local')
        cloudProfileStore.setNamespacedCloudProfiles([
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
      it('should include provider types from both regular and namespaced profiles', () => {
        cloudProfileStore.setCloudProfiles([
          {
            kind: 'CloudProfile',
            metadata: { name: 'aws' },
            spec: { type: 'aws' },
          },
        ])
        cloudProfileStore.setNamespacedCloudProfiles([
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
      it('should pass through profiles that already have cloudProfileSpec', () => {
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
        cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(getCloudProfileSpec(stored).kubernetes.versions[0].version).toBe('1.31.0')
      })

      it('should rehydrate profiles with cloudProfileSpecDiff from parent', () => {
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
        // null diff means spec is identical to parent
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'aws' } },
          status: {
            cloudProfileSpecDiff: null,
          },
        }
        cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(parentSpec)
        expect(stored.status.cloudProfileSpecDiff).toBeUndefined()
      })

      it('should rehydrate profiles with non-null cloudProfileSpecDiff from parent', () => {
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
        cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        expect(stored.status.cloudProfileSpec).toEqual(namespacedSpec)
        expect(stored.status.cloudProfileSpecDiff).toBeUndefined()
      })

      it('should skip rehydration when parent is not found', () => {
        cloudProfileStore.setCloudProfiles([])
        const namespacedProfile = {
          kind: 'NamespacedCloudProfile',
          metadata: { name: 'custom', namespace: 'garden-local' },
          spec: { parent: { kind: 'CloudProfile', name: 'nonexistent' } },
          status: {
            cloudProfileSpecDiff: null,
          },
        }
        cloudProfileStore.setNamespacedCloudProfiles([namespacedProfile], 'garden-local')
        const stored = cloudProfileStore.namespacedCloudProfileList[0]
        // Profile should be passed through unchanged (no cloudProfileSpec added)
        expect(stored.status.cloudProfileSpec).toBeUndefined()
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
