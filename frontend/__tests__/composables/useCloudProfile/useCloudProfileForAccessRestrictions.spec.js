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

import { useCloudProfileForAccessRestrictions } from '@/composables/useCloudProfile/useCloudProfileForAccessRestrictions'

describe('composables', () => {
  describe('useCloudProfileForAccessRestrictions', () => {
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

    describe('#accessRestrictionsByRegion', () => {
      it('should return access restrictions for region1', () => {
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const restrictions = accessRestrictionsByRegion(region)
        expect(restrictions.value).toHaveLength(2)
        expect(restrictions.value[0]).toEqual({ name: 'eu-access-only' })
        expect(restrictions.value[1]).toEqual({ name: 'private-access' })
      })

      it('should return access restrictions for region2', () => {
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region2')
        const restrictions = accessRestrictionsByRegion(region)
        expect(restrictions.value).toHaveLength(1)
        expect(restrictions.value[0]).toEqual({ name: 'eu-access-only' })
      })

      it('should return empty array for region with no restrictions', () => {
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region3')
        const restrictions = accessRestrictionsByRegion(region)
        expect(restrictions.value).toHaveLength(0)
      })

      it('should return empty array for non-existent region', () => {
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region-non-existent')
        const restrictions = accessRestrictionsByRegion(region)
        expect(restrictions.value).toHaveLength(0)
      })

      it('should return empty array when cloud profile is null', () => {
        cloudProfile.value = null
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const restrictions = accessRestrictionsByRegion(region)
        expect(restrictions.value).toHaveLength(0)
      })

      it('should throw error if region is not a ref', () => {
        const { accessRestrictionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        expect(() => accessRestrictionsByRegion('region1').value).toThrow('region must be a ref!')
      })
    })

    describe('#accessRestrictionDefinitionsByRegion', () => {
      it('should return access restriction definitions for region1', () => {
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(2)
        expect(definitions.value[0].key).toBe('eu-access-only')
        expect(definitions.value[1].key).toBe('private-access')
      })

      it('should return only matching definitions for region2', () => {
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region2')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(1)
        expect(definitions.value[0].key).toBe('eu-access-only')
      })

      it('should return empty array when no restrictions are configured', () => {
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region3')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when region does not exist', () => {
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('non-existent-region')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when no config items are available', () => {
        configStore.setConfiguration({ accessRestriction: { items: [] } })
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should return empty array when cloud profile is null', () => {
        cloudProfile.value = null
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const definitions = accessRestrictionDefinitionsByRegion(region)
        expect(definitions.value).toHaveLength(0)
      })

      it('should throw error if region is not a ref', () => {
        const { accessRestrictionDefinitionsByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        expect(() => accessRestrictionDefinitionsByRegion('region1').value).toThrow('region must be a ref!')
      })
    })

    describe('#accessRestrictionNoItemsTextByRegion', () => {
      it('should return formatted text with region placeholder', () => {
        const { accessRestrictionNoItemsTextByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('us-east-1')
        const text = accessRestrictionNoItemsTextByRegion(region)
        expect(text.value).toBe('No access restriction options available for region us-east-1')
      })

      it('should use default text when config is not set', () => {
        configStore.setConfiguration({})
        const { accessRestrictionNoItemsTextByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('eu-central-1')
        const text = accessRestrictionNoItemsTextByRegion(region)
        expect(text.value).toBe('No access restriction options available for region eu-central-1')
      })

      it('should support cloudProfileName placeholder', () => {
        configStore.setConfiguration({
          accessRestriction: {
            noItemsText: 'No restrictions for ${cloudProfileName} in ${region}', // eslint-disable-line no-template-curly-in-string
          },
        })
        const { accessRestrictionNoItemsTextByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        const region = ref('region1')
        const text = accessRestrictionNoItemsTextByRegion(region)
        expect(text.value).toBe('No restrictions for foo in region1')
      })

      it('should throw error if region is not a ref', () => {
        const { accessRestrictionNoItemsTextByRegion } = useCloudProfileForAccessRestrictions(cloudProfile)
        expect(() => accessRestrictionNoItemsTextByRegion('region1').value).toThrow('region must be a ref!')
      })
    })

    describe('error handling', () => {
      it('should throw error if cloudProfile is not a ref', () => {
        const plainObject = { metadata: { name: 'test' } }
        expect(() => useCloudProfileForAccessRestrictions(plainObject)).toThrow('cloudProfile must be a ref!')
      })
    })
  })
})
