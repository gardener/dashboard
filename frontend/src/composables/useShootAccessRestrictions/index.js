//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { useShootMetadata } from '../useShootMetadata'

import { NAND } from './helper'

import {
  get,
  set,
  unset,
  keyBy,
} from '@/lodash'

export function useShootAccessRestrictions (shootItem, options = {}) {
  const {
    cloudProfileStore = useCloudProfileStore(),
  } = options

  const {
    getShootAnnotation,
    setShootAnnotation,
    unsetShootAnnotation,
  } = useShootMetadata(shootItem, options)

  const shootCloudProfileName = computed(() => {
    return get(shootItem.value, 'spec.cloudProfileName')
  })

  const shootRegion = computed(() => {
    return get(shootItem.value, 'spec.region')
  })

  function getSeedSelectorMatchLabel (key, defaultValue) {
    return get(shootItem.value, `spec.seedSelector.matchLabels["${key}"]`, `${defaultValue}`)
  }

  function setSeedSelectorMatchLabel (key, value) {
    set(shootItem.value, `spec.seedSelector.matchLabels["${key}"]`, `${value}`)
  }

  function unsetSeedSelectorMatchLabel (key) {
    unset(shootItem.value, `spec.seedSelector.matchLabels["${key}"]`)
  }

  const accessRestrictionDefinitionList = computed(() => {
    return cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion({
      cloudProfileName: shootCloudProfileName.value,
      region: shootRegion.value,
    })
  })

  const accessRestrictionNoItemsText = computed(() => {
    return cloudProfileStore.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({
      cloudProfileName: shootCloudProfileName.value,
      region: shootRegion.value,
    })
  })

  const accessRestrictionDefinitions = computed(() => {
    const accessRestrictionDefinitions = {}
    for (const definition of accessRestrictionDefinitionList.value) {
      const { key, options } = definition
      accessRestrictionDefinitions[key] = {
        ...definition,
        options: keyBy(options, 'key'),
      }
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

  function getAccessRestrictionValue (key) {
    const { input } = accessRestrictionDefinitions.value[key]
    const inverted = !!input?.inverted
    const defaultValue = inverted
    const value = getSeedSelectorMatchLabel(key, defaultValue) === 'true'
    return NAND(value, inverted)
  }

  function setAccessRestrictionValue (key, value) {
    const { input, options } = accessRestrictionDefinitions.value[key]
    const enabled = NAND(value, !!input?.inverted)
    if (enabled) {
      setSeedSelectorMatchLabel(key, 'true')
    } else {
      unsetSeedSelectorMatchLabel(key)
    }
    for (const key of Object.keys(options)) {
      if (enabled) {
        setAccessRestrictionOptionValue(key, false)
      } else {
        unsetShootAnnotation(key)
      }
    }
  }

  function getAccessRestrictionOptionValue (key) {
    const { accessRestrictionKey } = accessRestrictionOptionDefinitions.value[key]
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', key])
    const inverted = !!input?.inverted
    const defaultValue = inverted
    const value = getShootAnnotation(key, `${defaultValue}`) === 'true'
    return NAND(value, inverted)
  }

  function setAccessRestrictionOptionValue (key, value) {
    const { accessRestrictionKey } = accessRestrictionOptionDefinitions.value[key]
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', key])
    const inverted = !!input?.inverted
    setShootAnnotation(key, `${NAND(value, inverted)}`)
  }

  const accessRestrictionList = computed(() => {
    const accessRestrictionList = []
    for (const definition of accessRestrictionDefinitionList.value) {
      const {
        key,
        display: {
          visibleIf = false,
          title = key,
          description,
        },
        options: optionDefinitions,
      } = definition

      const value = getAccessRestrictionValue(key)
      if (visibleIf !== value) {
        continue // skip
      }

      const accessRestrictionOptionList = []
      for (const optionDefinition of optionDefinitions) {
        const {
          key,
          display: {
            visibleIf = false,
            title = key,
            description,
          },
        } = optionDefinition

        const value = getAccessRestrictionOptionValue(key)
        if (value !== visibleIf) {
          continue // skip
        }

        accessRestrictionOptionList.push({
          key,
          title,
          description,
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
    getSeedSelectorMatchLabel,
    setSeedSelectorMatchLabel,
    unsetSeedSelectorMatchLabel,
    accessRestrictionList,
  }
}
