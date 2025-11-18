//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useConfigStore } from '@/store/config'

import { useAccessRestrictions } from '@/composables/useCloudProfile/useAccessRestrictions'

describe('composables', () => {
  describe('useAccessRestrictions', () => {
    let cloudProfile
    let configStore

    beforeEach(() => {
      setActivePinia(createPinia())
      configStore = useConfigStore()
      configStore.setConfiguration({
        accessRestriction: {
          noItemsText: 'No access restriction options available for region ${region}', // eslint-disable-line no-template-curly-in-string
          items: [
            {
              key: 'eu-access-only',
              display: {
                visibleIf: true,
              },
              input: {
                title: 'EU Access Only',
              },
              options: [
                {
                  key: 'support-access',
                  display: {
                    visibleIf: true,
                  },
                  input: {
                    title: 'Support Access',
                    description: 'Allow support access',
                  },
                },
              ],
            },
            {
              key: 'private-access',
              display: {
                visibleIf: true,
              },
              input: {
                title: 'Private Access',
              },
              options: [],
            },
          ],
        },
      })

      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        spec: {
          regions: [
            {
              name: 'region1',
              accessRestrictions: [
                {
                  name: 'eu-access-only',
                },
                {
                  name: 'private-access',
                },
              ],
            },
            {
              name: 'region2',
              accessRestrictions: [
                {
                  name: 'eu-access-only',
                },
              ],
            },
            {
              name: 'region3',
              accessRestrictions: [],
            },
          ],
        },
      })
    })

    describe('#useAccessRestrictionDefinitions', () => {
      it('should return access restriction definitions for region1', () => {
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(2)
        expect(definitions.value[0].key).toBe('eu-access-only')
        expect(definitions.value[1].key).toBe('private-access')
      })

      it('should return only matching definitions for region2', () => {
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('region2')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(1)
        expect(definitions.value[0].key).toBe('eu-access-only')
      })

      it('should return empty array when no restrictions are configured', () => {
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('region3')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when region does not exist', () => {
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('non-existent-region')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when no config items are available', () => {
        configStore.setConfiguration({ accessRestriction: { items: [] } })
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when cloud profile is null', () => {
        cloudProfile.value = null
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = useAccessRestrictionDefinitions(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should throw error if region is not a ref', () => {
        const { useAccessRestrictionDefinitions } = useAccessRestrictions(cloudProfile)
        expect(() => useAccessRestrictionDefinitions('region1').value).toThrow('region must be a ref!')
      })
    })

    describe('#useAccessRestrictionNoItemsText', () => {
      it('should return formatted text with region placeholder', () => {
        const { useAccessRestrictionNoItemsText } = useAccessRestrictions(cloudProfile)
        const region = ref('us-east-1')
        const text = useAccessRestrictionNoItemsText(region)
        expect(text.value).toBe('No access restriction options available for region us-east-1')
      })

      it('should use default text when config is not set', () => {
        configStore.setConfiguration({})
        const { useAccessRestrictionNoItemsText } = useAccessRestrictions(cloudProfile)
        const region = ref('eu-central-1')
        const text = useAccessRestrictionNoItemsText(region)
        expect(text.value).toBe('No access restriction options available for region eu-central-1')
      })

      it('should support cloudProfileName placeholder', () => {
        configStore.setConfiguration({
          accessRestriction: {
            noItemsText: 'No restrictions for ${cloudProfileName} in ${region}', // eslint-disable-line no-template-curly-in-string
          },
        })
        const { useAccessRestrictionNoItemsText } = useAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const text = useAccessRestrictionNoItemsText(region)
        expect(text.value).toBe('No restrictions for foo in region1')
      })

      it('should throw error if region is not a ref', () => {
        const { useAccessRestrictionNoItemsText } = useAccessRestrictions(cloudProfile)
        expect(() => useAccessRestrictionNoItemsText('region1').value).toThrow('region must be a ref!')
      })
    })

    describe('error handling', () => {
      it('should throw error if cloudProfile is not a ref', () => {
        const plainObject = { metadata: { name: 'test' } }
        expect(() => useAccessRestrictions(plainObject)).toThrow('cloudProfile must be a ref!')
      })
    })
  })
})
