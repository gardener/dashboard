//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'

export const useShootResources = manifest => {
  const resources = computed({
    get () {
      return get(manifest.value, ['spec', 'resources'])
    },
    set (value) {
      set(manifest.value, ['spec', 'resources'], value)
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
    const secret = find(resources.value, ['name', resourceName])
    return get(secret, ['resourceRef', 'name'])
  }

  return {
    resources,
    deleteResource,
    setResource,
    getResourceRefName,
  }
}
