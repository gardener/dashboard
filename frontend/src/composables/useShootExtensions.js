//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  get,
  set,
  find,
  filter,
  isEmpty,
} from '@/lodash'

export const useShootExtensions = manifest => {
  const extensions = computed({
    get () {
      return get(manifest.value, 'spec.extensions')
    },
    set (value) {
      set(manifest.value, 'spec.extensions', value)
    },
  })

  function setExtension ({ type, providerConfig }) {
    if (!type) {
      return
    }
    if (isEmpty(extensions.value)) {
      extensions.value = [{ type, providerConfig }]
    } else {
      const extension = find(extensions.value, ['type', type])
      if (extension) {
        extension.providerConfig = providerConfig
      } else {
        extensions.value.push({ type, providerConfig })
      }
    }
  }

  function deleteExtension (extensionType) {
    extensions.value = filter(extensions.value, extension => extension.type !== extensionType)
  }

  return {
    extensions,
    setExtension,
    deleteExtension,
  }
}
