//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useProjectMetadata } from '@/composables/useProjectMetadata/index.js'

import { isMdiIcon } from '@/utils/mdiIcons'

import cloneDeep from 'lodash/cloneDeep'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import isObject from 'lodash/isObject'
import map from 'lodash/map'
import some from 'lodash/some'
import camelCase from 'lodash/camelCase'
import find from 'lodash/find'

export function useProjectShootCustomFields (projectItem, options = {}) {
  const {
    logger = useLogger(),
  } = options

  const {
    projectName,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
  } = useProjectMetadata(projectItem)

  const rawShootCustomFields = computed({
    get () {
      const shootCustomFields = getProjectAnnotation('dashboard.gardener.cloud/shootCustomFields')
      if (!shootCustomFields) {
        return null
      }

      try {
        return JSON.parse(shootCustomFields)
      } catch (error) {
        logger.error('could not parse custom fields', error.message)
        return null
      }
    },
    set (value) {
      if (isEmpty(value)) {
        unsetProjectAnnotation('dashboard.gardener.cloud/shootCustomFields')
      } else {
        setProjectAnnotation('dashboard.gardener.cloud/shootCustomFields', JSON.stringify(value))
      }
    },
  })

  const shootCustomFields = computed(() => {
    if (!rawShootCustomFields.value) {
      return []
    }
    let shootCustomFields = rawShootCustomFields.value

    // extract values from legacy object format
    if (typeof rawShootCustomFields.value === 'object') {
      shootCustomFields = Object.values(rawShootCustomFields.value)
    }

    // filter out invalid custom fields
    shootCustomFields = filter(shootCustomFields, customField => {
      if (isEmpty(customField)) {
        return false // omit null values
      }
      if (some(customField, isObject)) {
        return false // omit custom fields with object values
      }
      return customField.name && customField.path
    })

    const defaultProperties = {
      showColumn: true,
      columnSelectedByDefault: true,
      showDetails: true,
      sortable: true,
      searchable: true,
    }
    shootCustomFields = map(shootCustomFields, customField => {
      const key = generateKeyFromName(customField.name)
      const customFieldWithKey = {
        ...defaultProperties,
        ...customField,
        icon: isMdiIcon(customField.icon) ? customField.icon : undefined,
        weight: Number(customField.weight) || 0,
      }
      Object.defineProperty(customFieldWithKey, 'key', {
        value: key,
        enumerable: false, // Ensure the key is not included in JSON.stringify()
      })
      return customFieldWithKey
    })
    return shootCustomFields
  })

  function addShootCustomField (customField) {
    shootCustomFields.value.push(cloneDeep(customField))
    rawShootCustomFields.value = shootCustomFields.value
  }

  function deleteShootCustomField (customField) {
    const key = generateKeyFromName(customField.name)
    const index = shootCustomFields.value.findIndex(field => field.key === key)
    if (index !== -1) {
      shootCustomFields.value.splice(index, 1)
    }
    rawShootCustomFields.value = shootCustomFields.value
  }

  function replaceShootCustomField (oldCustomField, newCustomField) {
    const key = generateKeyFromName(oldCustomField.name)
    const index = shootCustomFields.value.findIndex(field => field.key === key)
    if (index !== -1) {
      shootCustomFields.value.splice(index, 1, cloneDeep(newCustomField))
    }
    rawShootCustomFields.value = shootCustomFields.value
  }

  function isShootCustomFieldNameUnique (name) {
    for (const customField of shootCustomFields.value) {
      if (customField.name === name) {
        return false
      }

      // Ensure uniqueness when used as custom header
      if (generateKeyFromName(customField.name) === generateKeyFromName(name)) {
        return false
      }
    }

    return true
  }

  function getShootCustomFieldsPatchDocument () {
    return {
      metadata: {
        name: projectName.value,
        annotations: {
          'dashboard.gardener.cloud/shootCustomFields': getProjectAnnotation('dashboard.gardener.cloud/shootCustomFields', null),
        },
      },
    }
  }

  function getCustomFieldByKey (key) {
    return find(shootCustomFields.value, ['key', key])
  }

  function generateKeyFromName (name) {
    return `Z_${camelCase(name)}`
  }

  return {
    shootCustomFields,
    rawShootCustomFields,
    addShootCustomField,
    deleteShootCustomField,
    replaceShootCustomField,
    isShootCustomFieldNameUnique,
    getShootCustomFieldsPatchDocument,
    getCustomFieldByKey,
    generateKeyFromName,
  }
}
