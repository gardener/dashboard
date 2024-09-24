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

import {
  get,
  isEmpty,
} from '@/lodash'

export const useProjectCostObject = (projectItem, options = {}) => {
  const {
    configStore = useConfigStore(),
    projectMetadataComposable = useProjectMetadata(projectItem),
  } = options

  const {
    getProjectAnnotation,
    setProjectAnnotation,
  } = projectMetadataComposable

  const costObject = computed({
    get () {
      return getProjectAnnotation('billing.gardener.cloud/costObject')
    },
    set (value) {
      setProjectAnnotation('billing.gardener.cloud/costObject', value)
    },
  })

  const costObjectSettings = toRef(configStore, 'costObjectSettings')

  const costObjectSettingEnabled = computed(() => !isEmpty(costObjectSettings.value))

  const costObjectDescriptionHtml = computed(() => {
    const description = get(costObjectSettings.value, 'description')
    return transformHtml(description)
  })

  const costObjectTitle = computed(() => get(costObjectSettings.value, 'title'))

  const costObjectRegex = computed(() => {
    const pattern = get(costObjectSettings.value, 'regex', '[^]*')
    return new RegExp(pattern) // eslint-disable-line security/detect-non-literal-regexp
  })

  const costObjectErrorMessage = computed(() => get(costObjectSettings.value, 'errorMessage', ''))

  return {
    costObject,
    costObjectSettingEnabled,
    costObjectDescriptionHtml,
    costObjectTitle,
    costObjectRegex,
    costObjectErrorMessage,
  }
}
