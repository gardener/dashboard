//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'
import { shallowRef } from 'vue'

import { useShootAccessRestrictions } from '@/composables/useShootAccessRestrictions'

import { find } from '@/lodash'

describe('composables', () => {
  describe('useShootAccessRestrictions', () => {
    let accessRestrictionDefinition
    let shootResource

    const cloudProfileStore = {
      accessRestrictionDefinitionsByCloudProfileNameAndRegion: vi.fn(),
    }

    beforeAll(() => {
      setActivePinia(createPinia())
    })

    beforeEach(() => {
      accessRestrictionDefinition = {
        key: 'foo',
        input: {
          inverted: false,
        },
        options: [
          {
            key: 'foo-option-1',
            input: {
              inverted: false,
            },
          },
          {
            key: 'foo-option-2',
            input: {
              inverted: true,
            },
          },
          {
            key: 'foo-option-3',
            input: {
              inverted: true,
            },
          },
          {
            key: 'foo-option-4',
            input: {
              inverted: true,
            },
          },
        ],
      }
      shootResource = shallowRef({
        metadata: {
          annotations: {
            'foo-option-1': 'false',
            'foo-option-2': 'false',
            'foo-option-3': 'true',
          },
        },
        spec: {
          cloudProfileName: 'cloud-profile-name',
          region: 'region',
          seedSelector: {
            matchLabels: {
              foo: 'true',
            },
          },
        },
      })

      cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion.mockReturnValue([
        accessRestrictionDefinition,
      ])
    })

    it('should map definition and shoot resources to access restriction data model', () => {
      const {
        getAccessRestrictionValue,
        getAccessRestrictionOptionValue,
      } = useShootAccessRestrictions(shootResource, {
        cloudProfileStore,
      })
      const { key, options } = accessRestrictionDefinition
      expect(getAccessRestrictionValue(key)).toBe(true)
      expect(options.map(({ key }) => getAccessRestrictionOptionValue(key))).toEqual([
        false,
        true,
        false,
        false,
      ])
    })

    it('should invert access restriction', () => {
      accessRestrictionDefinition.input.inverted = true
      const {
        getAccessRestrictionValue,
      } = useShootAccessRestrictions(shootResource, {
        cloudProfileStore,
      })
      const { key } = accessRestrictionDefinition
      expect(getAccessRestrictionValue(key)).toBe(false)
    })

    it('should not invert option', () => {
      const option = find(accessRestrictionDefinition.options, ['key', 'foo-option-2'])
      option.input.inverted = false
      const {
        getAccessRestrictionOptionValue,
      } = useShootAccessRestrictions(shootResource, {
        cloudProfileStore,
      })
      expect(getAccessRestrictionOptionValue(option.key)).toBe(false)
    })

    it('should invert option', () => {
      const option = find(accessRestrictionDefinition.options, ['key', 'foo-option-2'])
      option.input.inverted = true
      const {
        getAccessRestrictionOptionValue,
      } = useShootAccessRestrictions(shootResource, {
        cloudProfileStore,
      })
      expect(getAccessRestrictionOptionValue(option.key)).toBe(true)
    })
  })
})
