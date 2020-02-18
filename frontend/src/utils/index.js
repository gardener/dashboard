//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import moment from 'moment-timezone'
import semver from 'semver'
import md5 from 'md5'
import DOMPurify from 'dompurify'
import marked from 'marked'
import capitalize from 'lodash/capitalize'
import replace from 'lodash/replace'
import get from 'lodash/get'
import head from 'lodash/head'
import map from 'lodash/map'
import merge from 'lodash/merge'
import pick from 'lodash/pick'
import toLower from 'lodash/toLower'
import toUpper from 'lodash/toUpper'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import words from 'lodash/words'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import every from 'lodash/every'
import startsWith from 'lodash/startsWith'
import split from 'lodash/split'
import join from 'lodash/join'
import last from 'lodash/last'
import sample from 'lodash/sample'
import compact from 'lodash/compact'
import store from '../store'
const uuidv4 = require('uuid/v4')

export function emailToDisplayName (value) {
  if (value) {
    const names = map(words(replace(value, /@.*$/, '')), capitalize)
    const givenName = names.shift()
    return join(compact([ join(names, ' '), givenName ]), ', ')
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
        let validationErrorMessage = get(vm.validationErrors, field)[key]
        if (typeof validationErrorMessage === 'function') {
          validationErrorMessage = validationErrorMessage(get(validationForField.$params, key))
        }
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
      // Ensure that the input field has been rendered
      inputRef.focus()
      inputRef.select()
    })
  }
}

export function fullDisplayName (username) {
  if (!username) {
    return ''
  }
  if (isEmail(username)) {
    return emailToDisplayName(username)
  }
  if (isServiceAccount(username)) {
    const [ namespace, serviceaccount ] = split(username, ':', 4).slice(2)
    return toUpper(`${namespace} / ${serviceaccount}`)
  }
  return username
}

export function displayName (username) {
  if (!username) {
    return ''
  }
  if (isEmail(username)) {
    return emailToDisplayName(username)
  }
  if (isServiceAccount(username)) {
    const [ , serviceaccount ] = split(username, ':', 4).slice(2)
    return toUpper(serviceaccount)
  }
  return username
}

export function parseSize (value) {
  return parseInt(replace(value, /(^.+\D)(\d+)(\D.+$)/i, '$2'))
}

export function isEmail (value) {
  return /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(value)
}

export function gravatarUrlGeneric (username, size = 128) {
  if (!username) {
    return gravatarUrlMp('undefined', size)
  }
  if (isEmail(username)) {
    return gravatarUrlIdenticon(username, size)
  }
  if (isServiceAccount(username)) {
    return gravatarUrlRobohash(username, size)
  }
  return gravatarUrlRetro(username, size)
}

export function gravatarUrlMp (username, size = 128) {
  return gravatarUrl(username, 'mp', size)
}

export function gravatarUrlRetro (username, size = 128) {
  return gravatarUrl(username, 'retro', size)
}

export function gravatarUrlIdenticon (email, size = 128) {
  return gravatarUrl(email, 'identicon', size)
}

export function gravatarUrlRobohash (username, size = 128) {
  return gravatarUrl(username, 'robohash', size)
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
  const params = {
    namespace: namespace
  }

  return { name: routeName(route), params }
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

export function getTimeStringFrom (time, fromTime, withoutSuffix = false) {
  if (!time) {
    return undefined
  } else {
    return moment(time).from(fromTime, withoutSuffix)
  }
}

export function getTimeStringTo (time, toTime, withoutPrefix = false) {
  if (!time) {
    return undefined
  } else {
    if (time.getTime() === toTime.getTime()) {
      // Equal dates result in text "a few seconds ago", this is not we want here...
      toTime.setSeconds(toTime.getSeconds() + 1)
    }
    return moment(time).to(toTime, withoutPrefix)
  }
}

export function isOwnSecretBinding (secret) {
  return get(secret, 'metadata.namespace') === get(secret, 'metadata.bindingNamespace')
}

const availableK8sUpdatesCache = {}
export function availableK8sUpdatesForShoot (spec) {
  const shootVersion = get(spec, 'kubernetes.version')
  const cloudProfileName = spec.cloudProfileName

  let newerVersions = get(availableK8sUpdatesCache, `${shootVersion}_${cloudProfileName}`)
  if (newerVersions !== undefined) {
    return newerVersions
  } else {
    newerVersions = {}
    const allVersions = store.getters.kubernetesVersions(cloudProfileName)

    let newerVersion = false
    forEach(allVersions, ({ version, expirationDateString }) => {
      if (semver.gt(version, shootVersion)) {
        newerVersion = true
        const diff = semver.diff(version, shootVersion)
        if (!newerVersions[diff]) {
          newerVersions[diff] = []
        }
        newerVersions[diff].push({ version, expirationDateString })
      }
    })
    newerVersions = newerVersion ? newerVersions : null
    availableK8sUpdatesCache[`${shootVersion}_${cloudProfileName}`] = newerVersions

    return newerVersions
  }
}

export function getCreatedBy (metadata) {
  return get(metadata, ['annotations', 'garden.sapcloud.io/createdBy'])
}

export function hasAlertmanager (metadata) {
  if (get(metadata, ['annotations', 'garden.sapcloud.io/operatedBy'])) {
    return true
  }
  return false
}

export function getProjectName (metadata) {
  const namespace = get(metadata, ['namespace'])
  const projectList = store.getters.projectList
  const project = find(projectList, ['metadata.namespace', namespace])
  const projectName = get(project, 'metadata.name') || replace(namespace, /^garden-/, '')
  return projectName
}

export function isShootStatusHibernated (status) {
  return get(status, 'hibernated', false)
}

export function canLinkToSeed ({ namespace, seedName }) {
  /*
  * Soils cannot be linked currently as they have representation as "shoot".
  * Currently there is only the secret available.
  * If we are not in the garden namespace we expect a seed to be present
  * TODO refactor once we have an owner ref on the shoot pointing to the seed
  */
  return seedName && namespace !== 'garden'
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
export function shootHasIssue (shoot) {
  return get(shoot, ['metadata', 'labels', 'shoot.garden.sapcloud.io/status'], 'healthy') !== 'healthy'
}

export function isReconciliationDeactivated (metadata) {
  const truthyValues = ['1', 't', 'T', 'true', 'TRUE', 'True']
  return includes(truthyValues, get(metadata, ['annotations', 'shoot.garden.sapcloud.io/ignore']))
}

export function isStatusProgressing (metadata) {
  return get(metadata, ['labels', 'shoot.garden.sapcloud.io/status']) === 'progressing'
}

export function isSelfTerminationWarning (expirationTimestamp) {
  return expirationTimestamp && new Date(expirationTimestamp) - new Date() < 24 * 60 * 60 * 1000 // 1 day
}

export function isValidTerminationDate (expirationTimestamp) {
  return expirationTimestamp && new Date(expirationTimestamp) > new Date()
}

export function isTypeDelete (lastOperation) {
  return get(lastOperation, 'type') === 'Delete'
}

export function isServiceAccount (username) {
  return startsWith(username, 'system:serviceaccount:')
}

export function isServiceAccountFromNamespace (username, namespace) {
  return startsWith(username, `system:serviceaccount:${namespace}:`)
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

export function infrastructureColor (kind) {
  switch (kind) {
    case 'openstack':
      return '#ED1944'
    case 'azure':
      return '#2075b8'
    case 'aws':
      return '#ff9900'
  }
}

export function encodeBase64 (input) {
  return Buffer.from(input, 'utf8').toString('base64')
}

export function encodeBase64Url (input) {
  let output = encodeBase64(input)
  output = output.replace(/=/g, '')
  output = output.replace(/\+/g, '-')
  output = output.replace(/\//g, '_')
  return output
}

export function purposeRequiresHibernationSchedule (purpose) {
  const defaultHibernationSchedules = get(store, 'state.cfg.defaultHibernationSchedule')
  if (defaultHibernationSchedules) {
    if (isEmpty(purpose)) {
      return true
    }
    return !isEmpty(get(defaultHibernationSchedules, purpose))
  }
  return false
}

export function isShootHasNoHibernationScheduleWarning (shoot) {
  const annotations = get(shoot, 'metadata.annotations', {})
  const purpose = annotations['garden.sapcloud.io/purpose']
  if (purposeRequiresHibernationSchedule(purpose)) {
    const hasNoScheduleFlag = !!annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule']
    if (!hasNoScheduleFlag && isEmpty(get(shoot, 'spec.hibernation.schedules'))) {
      return true
    }
  }
  return false
}

export function shortRandomString (length) {
  const start = 'abcdefghijklmnopqrstuvwxyz'
  const possible = start + '0123456789'
  var text = start.charAt(Math.floor(Math.random() * start.length))
  for (var i = 0; i < (length - 1); i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function selfTerminationDaysForSecret (secret) {
  const clusterLifetimeDays = function (quotas, scope) {
    return get(find(quotas, scope), 'spec.clusterLifetimeDays')
  }

  const quotas = get(secret, 'quotas')
  let terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'core.gardener.cloud/v1alpha1', kind: 'Project' } } })
  if (!terminationDays) {
    terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'v1', kind: 'Secret' } } })
  }

  return terminationDays
}

export function purposesForSecret (secret) {
  return selfTerminationDaysForSecret(secret) ? ['evaluation'] : ['evaluation', 'development', 'production']
}

export const shootAddonList = [
  {
    name: 'kubernetes-dashboard',
    title: 'Dashboard',
    description: 'General-purpose web UI for Kubernetes clusters. Several high-profile attacks have shown weaknesses, so installation is not recommend, especially not for production clusters.',
    visible: true,
    enabled: false
  },
  {
    name: 'nginx-ingress',
    title: 'Nginx Ingress',
    description: 'Default ingress-controller with static configuration and conservatively sized (cannot be changed). Therefore, it is not recommended for production clusters. We recommend alternatively to install an ingress-controller of your liking, which you can freely configure, program, and scale to your production needs.',
    visible: true,
    enabled: true
  }
]

const kymaAddonDescription = `Kyma is a platform for extending applications with serverless functions and microservices. As an integrated stack of the best cloud-native projects, including Istio, Kiali, Prometheus, Grafana, Jaeger, Knative, Ory Hydra, and Loki it allows running modern microservice or serverless applications on top of Kubernetes.
Kyma comes with a new, lightweight Service Catalog you can use to easily connect services provided by hyperscalers such as Azure, GCP, or AWS, as well as SAP applications.

To successfully run Kyma, the minimal cluster size should be **2 nodes (4 CPU and 16GB each)**, but it is recommended to have 3-5 nodes. Additionally, make sure your Kubernetes version is **1.15.x or lower**.

You can find a link to Kyma management Console UI and credentials in the shoot cluster dashboard.
To learn more, visit the [Kyma website](https://kyma-project.io). If you want to discuss Kyma, ask questions, and contribute, join the Kyma community in the [Slack channel](http://slack.kyma-project.io).`

export function addKymaAddon (options) {
  const kymaAddon = {
    name: 'kyma',
    title: 'Kyma',
    description: kymaAddonDescription,
    visible: true,
    enabled: false,
    forbidDisable: true
  }
  if (options) {
    const overwrite = pick(options, ['title', 'description', 'visible', 'enabled', 'forbidDisable'])
    merge(kymaAddon, overwrite)
  }
  kymaAddon.description = compileMarkdown(kymaAddon.description)
  shootAddonList.push(kymaAddon)
}

export function compileMarkdown (text) {
  return DOMPurify.sanitize(marked(text, {
    gfm: true,
    breaks: true,
    tables: true
  }))
}

export function shootAddonByName (name) {
  return find(shootAddonList, ['name', name])
}

export function randomLocalMaintenanceBegin () {
  // randomize maintenance time window
  const hours = ['22', '23', '00', '01', '02', '03', '04', '05']
  const randomHour = sample(hours)
  // use local timezone offset
  const localBegin = `${randomHour}:00`

  return localBegin
}

export function utcMaintenanceWindowFromLocalBegin ({ localBegin, timezone }) {
  timezone = timezone || store.state.localTimezone
  if (localBegin) {
    const utcMoment = moment.tz(localBegin, 'HH:mm', timezone).utc()

    let utcBegin
    let utcEnd
    if (utcMoment && utcMoment.isValid()) {
      utcBegin = utcMoment.format('HHmm00+0000')
      utcMoment.add(1, 'h')
      utcEnd = utcMoment.format('HHmm00+0000')
    }
    return { utcBegin, utcEnd }
  }
  return undefined
}

export function generateWorker (availableZones, cloudProfileName, region) {
  const id = uuidv4()
  const name = `worker-${shortRandomString(5)}`
  const zones = [sample(availableZones)]
  const machineTypesForZone = store.getters.machineTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName, region, zones })
  const machineType = get(head(machineTypesForZone), 'name')
  const volumeTypesForZone = store.getters.volumeTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName, region, zones })
  const volumeType = get(head(volumeTypesForZone), 'name')
  const machineImage = store.getters.defaultMachineImageForCloudProfileName(cloudProfileName)
  const minVolumeSize = store.getters.minimumVolumeSizeByCloudProfileNameAndRegion({ cloudProfileName, region })
  const defaultVolumeSize = parseSize(minVolumeSize) <= parseSize('50Gi') ? '50Gi' : minVolumeSize
  const worker = {
    id,
    name,
    minimum: 1,
    maximum: 2,
    maxSurge: 1,
    machine: {
      type: machineType,
      image: machineImage
    },
    zones
  }
  if (volumeType) {
    worker.volume = {
      type: volumeType,
      size: defaultVolumeSize
    }
  }

  return worker
}

export const memberRoles = [
  {
    name: 'admin',
    displayName: 'Admin'
  },
  {
    name: 'viewer',
    displayName: 'Viewer'
  }
]
