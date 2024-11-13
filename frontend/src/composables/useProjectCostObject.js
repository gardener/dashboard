//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  toRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import { transformHtml } from '@/utils'

import { useProjectMetadata } from './useProjectMetadata'

import find from 'lodash/find'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

export const useProjectCostObject = (projectItem, options = {}) => {
  const {
    configStore = useConfigStore(),
    projectMetadataComposable = useProjectMetadata(projectItem),
  } = options

  const {
    projectName,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
  } = projectMetadataComposable

  const costObject = computed({
    get () {
      return getProjectAnnotation('billing.gardener.cloud/costObject')
    },
    set (value) {
      if (value) {
        setProjectAnnotation('billing.gardener.cloud/costObject', value)
      } else {
        unsetProjectAnnotation('billing.gardener.cloud/costObject')
      }
    },
  })

  const costObjectType = computed({
    get () {
      return getProjectAnnotation('billing.gardener.cloud/costObjectType')
    },
    set (value) {
      setProjectAnnotation('billing.gardener.cloud/costObjectType', value)
    },
  })

  const costObjectsSettings = toRef(configStore, 'costObjectsSettings')

  const costObjectsSettingEnabled = computed(() => !isEmpty(costObjectsSettings.value))

  const costObjectTypes = computed(() => {
    return map(costObjectsSettings.value, ({ type, title }) => ({ value: type, title }))
  })

  const costObjectSettings = computed(() => {
    return find(costObjectsSettings.value, ['type', costObjectType.value])
  })

  const costObjectDescriptionHtml = computed(() => {
    const description = get(costObjectSettings.value, ['description'])
    return transformHtml(description)
  })

  const costObjectSettingsType = computed(() => get(costObjectSettings.value, ['type']))

  const costObjectTitle = computed(() => get(costObjectSettings.value, ['title']))

  const costObjectRegex = computed(() => {
    const pattern = get(costObjectSettings.value, ['regex'], '[^]*')
    return new RegExp(pattern) // eslint-disable-line security/detect-non-literal-regexp
  })

  const costObjectErrorMessage = computed(() => get(costObjectSettings.value, ['errorMessage'], 'Invalid cost object'))

  function getCostObjectPatchDocument () {
    return {
      metadata: {
        name: projectName.value,
        annotations: {
          'billing.gardener.cloud/costObject': getProjectAnnotation('billing.gardener.cloud/costObject', null),
          'billing.gardener.cloud/costObjectType': getProjectAnnotation('billing.gardener.cloud/costObjectType', null),
        },
      },
    }
  }

  return {
    costObject,
    costObjectsSettingEnabled,
    costObjectTypes,
    costObjectType,
    costObjectDescriptionHtml,
    costObjectSettingsType,
    costObjectTitle,
    costObjectRegex,
    costObjectErrorMessage,
    getCostObjectPatchDocument,
  }
}
