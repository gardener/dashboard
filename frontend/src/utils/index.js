//
// Copyright 2018 by The Gardener Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

import capitalize from 'lodash/capitalize'
import replace from 'lodash/replace'
import get from 'lodash/get'
import head from 'lodash/head'
import keys from 'lodash/keys'
import intersection from 'lodash/intersection'
import md5 from 'md5'
import toLower from 'lodash/toLower'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import moment from 'moment'
import semver from 'semver'

export function emailToDisplayName (email) {
  if (email) {
    const [, givenName, familyName] = /^([^.]+)(?:\.([^@]+))?@.*$/.exec(email) || []
    return familyName ? `${capitalize(familyName)}, ${capitalize(givenName)}` : capitalize(givenName)
  }
}

export function handleTextFieldDrop (textField, fileTypePattern) {
  const textarea = textField.$refs.input

  function drop (event) {
    event.stopPropagation()
    event.preventDefault()

    const files = event.dataTransfer.files
    if (files.length) {
      const file = files[0]
      if (fileTypePattern.test(file.type)) {
        const reader = new FileReader()
        const onLoaded = event => {
          try {
            const result = JSON.parse(event.target.result)
            textField.inputValue = JSON.stringify(result, null, '  ')
          } catch (err) { /* ignore error */ }
        }
        reader.onloadend = onLoaded
        reader.readAsText(file)
      }
    }
  }

  function dragOver (event) {
    event.stopPropagation()
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  textarea.addEventListener('dragover', dragOver, false)
  textarea.addEventListener('drop', drop, false)
}

/*
 * popperRefs can be an array or a vue popper object
 */
export function closePopover (refs) {
  if (refs) {
    [].concat(refs).forEach(ref => ref.doClose())
  }
}

export function getValidationErrors (vm, field) {
  const errors = []
  const validationForField = get(vm.$v, field)
  if (!validationForField.$dirty) {
    return errors
  }

  const validators = vm.validators ? vm.validators : vm.$options.validations
  Object
    .keys(get(validators, field))
    .forEach(key => {
      if (!validationForField[key]) {
        const validationErrorMessage = get(vm.validationErrors, field)[key]
        if (validationErrorMessage) {
          errors.push(validationErrorMessage)
        } else {
          /* Fallback logic with generic error message.
          This should not happen as for each validation there must be a corresponding text */
          errors.push('Invalid input')
          console.error('validation error message for ' + field + '.' + key + ' not found')
        }
      }
    })
  return errors
}

export function setDelayedInputFocus (vm, fieldName) {
  setTimeout(() => {
    setInputFocus(vm, fieldName)
  }, 200)
}

export function setInputFocus (vm, fieldName) {
  const fieldRef = vm.$refs[fieldName]
  if (fieldRef) {
    const inputRef = fieldRef.$refs.input
    vm.$nextTick(() => {
      inputRef.focus()
      inputRef.select()
    })
  }
}

export function parseSize (value) {
  return parseInt(replace(value, /(^.+\D)(\d+)(\D.+$)/i, '$2'))
}

export function gravatar (email) {
  return `//www.gravatar.com/avatar/${md5(toLower(email))}?d=identicon&s=128`
}

export function routes (router, includeRoutesWithProjectScope) {
  const hasChildren = route => route.children && route.children.length
  const routes = router.options.routes
  const defaultRoute = find(routes, hasChildren)
  const hasMenu = route => route.meta && route.meta.menu && (includeRoutesWithProjectScope || (!includeRoutesWithProjectScope && !route.meta.projectScope))
  return filter(defaultRoute.children, hasMenu)
}

export function namespacedRoute (route, namespace) {
  const name = routeName(route)
  const params = {
    namespace: namespace
  }
  return {name, params}
}

export function routeName (route) {
  const firstChild = head(route.children)
  const toRouteName = get(route, 'meta.toRouteName')
  if (toRouteName) {
    return toRouteName
  } else if (route.name) {
    return route.name
  } else if (firstChild) {
    return firstChild.name
  } else {
    console.error('could not determine routeName')
    return undefined
  }
}

export function getDateFormatted (timestamp) {
  if (!timestamp) {
    return undefined
  } else {
    return moment(timestamp).format('YYYY-MM-DD')
  }
}

export function getTimeAgoFrom (time, fromTime) {
  if (!time) {
    return undefined
  } else {
    return moment(time).from(fromTime)
  }
}

export function getCloudProviderKind (object) {
  const cloudProviderKinds = ['aws', 'azure', 'gcp', 'openstack']
  return head(intersection(keys(object), cloudProviderKinds))
}

export function isOwnSecretBinding (secret) {
  return get(secret, 'namespace') === get(secret, 'bindingNamespace')
}

export function availableK8sUpdatesForShoot (shootVersion, allVersions) {
  const newerVersions = {}
  let newerVersion = false

  forEach(allVersions, (version) => {
    if (semver.gt(version, shootVersion)) {
      newerVersion = true
      const diff = semver.diff(version, shootVersion)
      if (!newerVersions[diff]) {
        newerVersions[diff] = []
      }
      newerVersions[diff].push(version)
    }
  })

  return newerVersion ? newerVersions : undefined
}

export function getCreatedBy () {
  return (metadata) => {
    // eslint-disable-next-line
    return get(metadata, ['annotations', 'garden.sapcloud.io/createdBy'], '-unknown-')
  }
}
