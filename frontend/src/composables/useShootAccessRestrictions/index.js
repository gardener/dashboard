//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { useCloudProfileForAccessRestrictions } from '@/composables/useCloudProfile/useCloudProfileForAccessRestrictions'

import { NAND } from './helper'

import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'

const shootPropertyMappings = Object.freeze({
  cloudProfileRef: ['spec', 'cloudProfile'],
  region: ['spec', 'region'],
})

export const useShootAccessRestrictions = (shootItem, options = {}) => {
  const {
    cloudProfileStore = useCloudProfileStore(),
  } = options

  const {
    cloudProfileRef,
    region,
  } = mapValues(shootPropertyMappings, path => {
    return computed(() => get(shootItem.value, path))
  })

  const cloudProfile = computed(() => cloudProfileStore.cloudProfileByRef(cloudProfileRef.value))
  const {
    accessRestrictionDefinitionsByRegion,
    accessRestrictionNoItemsTextByRegion,
  } = useCloudProfileForAccessRestrictions(cloudProfile)

  const accessRestrictionDefinitionList = computed(() => {
    return accessRestrictionDefinitionsByRegion(region).value
  })

  const accessRestrictionNoItemsText = computed(() => {
    return accessRestrictionNoItemsTextByRegion(region).value
  })

  const accessRestrictionDefinitions = computed(() => {
    const accessRestrictionDefinitions = {}
    for (const definition of accessRestrictionDefinitionList.value) {
      const { key, options } = definition
      set(accessRestrictionDefinitions, [key], {
        ...definition,
        options: keyBy(options, 'key'),
      })
    }
    return accessRestrictionDefinitions
  })

  const accessRestrictionOptionDefinitions = computed(() => {
    const accessRestrictionOptionDefinitions = {}
    for (const definition of accessRestrictionDefinitionList.value) {
      for (const optionDefinition of definition.options) {
        accessRestrictionOptionDefinitions[optionDefinition.key] = {
          accessRestrictionKey: definition.key,
          ...optionDefinition,
        }
      }
    }
    return accessRestrictionOptionDefinitions
  })

  function getAccessRestrictions () {
    return get(shootItem.value, ['spec', 'accessRestrictions'], [])
  }

  function setAccessRestrictions (accessRestrictions) {
    if (accessRestrictions.length > 0) {
      set(shootItem.value, ['spec', 'accessRestrictions'], accessRestrictions)
    } else {
      unset(shootItem.value, ['spec', 'accessRestrictions'])
    }
  }

  function getAccessRestrictionItem (key) {
    return getAccessRestrictions().find(ar => ar.name === key)
  }

  function getAccessRestrictionValue (key) {
    const accessRestrictionItem = getAccessRestrictionItem(key)
    return !!accessRestrictionItem
  }

  function setAccessRestrictionValue (key, value) {
    const accessRestrictions = getAccessRestrictions()
    const index = accessRestrictions.findIndex(ar => ar.name === key)
    if (value) {
      if (index === -1) {
        accessRestrictions.push({ name: key })
      }
    } else {
      if (index !== -1) {
        accessRestrictions.splice(index, 1)
      }
    }
    setAccessRestrictions(accessRestrictions)
  }

  function getAccessRestrictionOptionValue (accessRestrictionKey, optionKey) {
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', optionKey])
    const inverted = !!input?.inverted
    const defaultValue = inverted

    const accessRestrictionItem = getAccessRestrictionItem(accessRestrictionKey)
    if (!accessRestrictionItem || !accessRestrictionItem.options) {
      return NAND(defaultValue, inverted)
    }
    const value = get(accessRestrictionItem.options, [optionKey], `${defaultValue}`) === 'true'
    return NAND(value, inverted)
  }

  function setAccessRestrictionOptionValue (accessRestrictionKey, optionKey, value) {
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', optionKey])
    const inverted = !!input?.inverted
    const optionValue = NAND(value, inverted) ? 'true' : 'false'

    const accessRestrictions = getAccessRestrictions()
    let accessRestrictionItem = accessRestrictions.find(ar => ar.name === accessRestrictionKey)
    if (!accessRestrictionItem) {
      accessRestrictionItem = { name: accessRestrictionKey, options: {} }
      accessRestrictions.push(accessRestrictionItem)
    }
    if (!accessRestrictionItem.options) {
      accessRestrictionItem.options = {}
    }
    set(accessRestrictionItem.options, [optionKey], optionValue)
    setAccessRestrictions(accessRestrictions)
  }

  function getAccessRestrictionPatchData () {
    const accessRestrictions = get(shootItem.value, ['spec', 'accessRestrictions'], [])
    const data = {
      spec: {
        accessRestrictions,
      },
    }
    return data
  }

  const accessRestrictionList = computed(() => {
    const accessRestrictionList = []
    for (const definition of accessRestrictionDefinitionList.value) {
      const {
        key,
        display: {
          title = key,
          description,
        },
        options: optionDefinitions,
      } = definition

      const value = getAccessRestrictionValue(key)
      if (!value) {
        continue // Skip if access restriction is not enabled
      }

      const accessRestrictionOptionList = []
      for (const optionDefinition of Object.values(optionDefinitions)) {
        const {
          key: optionKey,
          display: {
            visibleIf = true,
            title: optionTitle = optionKey,
            description: optionDescription,
          },
        } = optionDefinition

        const optionValue = getAccessRestrictionOptionValue(key, optionKey)
        if (optionValue !== visibleIf) {
          continue // Skip
        }

        accessRestrictionOptionList.push({
          key: optionKey,
          title: optionTitle,
          description: optionDescription,
        })
      }

      accessRestrictionList.push({
        key,
        title,
        description,
        options: accessRestrictionOptionList,
      })
    }

    return accessRestrictionList
  })

  return {
    accessRestrictionDefinitionList,
    accessRestrictionNoItemsText,
    accessRestrictionDefinitions,
    accessRestrictionOptionDefinitions,
    getAccessRestrictionValue,
    setAccessRestrictionValue,
    getAccessRestrictionOptionValue,
    setAccessRestrictionOptionValue,
    accessRestrictionList,
    getAccessRestrictionPatchData,
  }
}
