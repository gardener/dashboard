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

export const useShootResources = manifest => {
  const resources = computed({
    get () {
      return get(manifest.value, 'spec.resources')
    },
    set (value) {
      set(manifest.value, 'spec.resources', value)
    },
  })

  function setResource ({ name, resourceRef }) {
    if (!name) {
      return
    }
    if (isEmpty(resources.value)) {
      resources.value = [{ name, resourceRef }]
    } else {
      const resource = find(resources.value, ['name', name])
      if (resource) {
        resource.resourceRef = resourceRef
      } else {
        resources.value.push({ name, resourceRef })
      }
    }
  }

  function deleteResource (resourceName) {
    resources.value = filter(resources.value, resource => resource.name !== resourceName)
  }

  function getResourceRefName (resourceName) {
    const secretResource = find(resources.value, ['name', resourceName])
    return get(secretResource, 'resourceRef.name')
  }

  return {
    resources,
    deleteResource,
    setResource,
    getResourceRefName,
  }
}
