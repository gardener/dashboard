//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import every from 'lodash/every'
import moment from 'moment-timezone'
import semver from 'semver'
import some from 'lodash/some'
import store from '../store'
import split from 'lodash/split'
import last from 'lodash/last'

export function emailToDisplayName (email) {
  if (email) {
    const [, givenName, familyName] = /^([^.]+)(?:\.([^@]+))?@.*$/.exec(email) || []
    return familyName ? `${capitalize(familyName)}, ${capitalize(givenName)}` : capitalize(givenName)
  }
}

export function serviceAccountToDisplayName (serviceAccount) {
  if (serviceAccount) {
    return last(split(serviceAccount, ':'))
  }
}

export function handleTextFieldDrop (textField, fileTypePattern, onDrop = (value) => {}) {
  const textarea = textField.$refs['input-slot']

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

            onDrop(JSON.stringify(result, null, '  '))
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

export function gravatarUrlIdenticon (email, size = 128) {
  return gravatarUrl(email, 'identicon', size)
}

export function gravatarUrlRobohash (email, size = 128) {
  return gravatarUrl(email, 'robohash', size)
}

export function gravatarUrl (value, image, size) {
  return `https://www.gravatar.com/avatar/${md5(toLower(value))}?d=${image}&s=${size}`
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
  return { name, params }
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

export function getTimestampFormatted (timestamp) {
  if (!timestamp) {
    return undefined
  }
  return moment(timestamp).format('lll')
}

export function getTimeStringFrom (time, fromTime) {
  if (!time) {
    return undefined
  } else {
    return moment(time).from(fromTime)
  }
}

export function getTimeStringTo (time, toTime) {
  if (!time) {
    return undefined
  } else {
    if (time.getTime() === toTime.getTime()) {
      // Equal dates result in text "a few seconds ago", this is not we want here...
      toTime.setSeconds(toTime.getSeconds() + 1)
    }
    return moment(time).to(toTime)
  }
}

export function getCloudProviderKind (object) {
  const cloudProviderKinds = ['aws', 'azure', 'gcp', 'openstack']
  return head(intersection(keys(object), cloudProviderKinds))
}

export function isOwnSecretBinding (secret) {
  return get(secret, 'metadata.namespace') === get(secret, 'metadata.bindingNamespace')
}

const availableK8sUpdatesCache = {}
export function availableK8sUpdatesForShoot (spec) {
  const shootVersion = get(spec, 'kubernetes.version')
  const cloudProfileName = get(spec, 'cloud.profile')

  let newerVersions = get(availableK8sUpdatesCache, `${shootVersion}_${cloudProfileName}`)
  if (newerVersions !== undefined) {
    return newerVersions
  } else {
    newerVersions = {}
    const allVersions = store.getters.kubernetesVersions(cloudProfileName)

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
    newerVersions = newerVersion ? newerVersions : null
    availableK8sUpdatesCache[`${shootVersion}_${cloudProfileName}`] = newerVersions

    return newerVersions
  }
}

export function getCreatedBy (metadata) {
  // eslint-disable-next-line
  return get(metadata, ['annotations', 'garden.sapcloud.io/createdBy'], '-unknown-')
}

export function isHibernated (spec) {
  if (!spec) {
    return false
  }

  const kind = getCloudProviderKind(spec.cloud)
  // eslint-disable-next-line
  const workers = get(spec, ['cloud', kind, 'workers'])
  const hibernationEnabled = get(spec, 'hibernation.enabled', false)
  return hibernationEnabled || some(workers, worker => get(worker, 'autoScalerMax') === 0)
}

export function canLinkToSeed ({ shootNamespace }) {
  /*
  * Soils cannot be linked currently as they have representation as "shoot".
  * Currently there is only the secret available.
  * If we are not in the garden namespace we expect a seed to be present
  * TODO refactor once we have an owner ref on the shoot pointing to the seed
  */
  return shootNamespace !== 'garden'
}

export function isUserError (errorCodes) {
  if (isEmpty(errorCodes)) {
    return false
  }

  const userErrorCodes = [
    'ERR_INFRA_UNAUTHORIZED',
    'ERR_INFRA_INSUFFICIENT_PRIVILEGES',
    'ERR_INFRA_QUOTA_EXCEEDED',
    'ERR_INFRA_DEPENDENCIES'
  ]
  return every(errorCodes, errorCode => includes(userErrorCodes, errorCode))
}

export function isReconciliationDeactivated (metadata) {
  // eslint-disable-next-line
  return get(metadata, ['annotations', 'shoot.garden.sapcloud.io/ignore']) === 'true'
}

export function isSelfTerminationWarning (expirationTimestamp) {
  return expirationTimestamp && new Date(expirationTimestamp) - new Date() < 24 * 60 * 60 * 1000 // 1 day
}

export function isValidTerminationDate (expirationTimestamp) {
  return expirationTimestamp && new Date(expirationTimestamp) > new Date()
}

export function isShootMarkedForDeletion (metadata) {
  // eslint-disable-next-line
  const confirmation = get(metadata, ['annotations', 'confirmation.garden.sapcloud.io/deletion'], false)
  const deletionTimestamp = get(metadata, 'deletionTimestamp')

  return !!deletionTimestamp && !!confirmation
}

export function isTypeDelete (lastOperation) {
  return get(lastOperation, 'type') === 'Delete'
}

// expect colors to be in format <color> <optional:modifier>
export function textColor (color) {
  const colorArr = split(color, ' ')
  const colorStr = colorArr[0]
  const colorMod = colorArr[1]
  let textColor = `${colorStr}--text`
  if (colorMod) {
    textColor = `${textColor} text--${colorMod}`
  }
  return textColor
}
