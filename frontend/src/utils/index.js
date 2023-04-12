//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import semver from 'semver'
import capitalize from 'lodash/capitalize'
import replace from 'lodash/replace'
import get from 'lodash/get'
import head from 'lodash/head'
import map from 'lodash/map'
import toLower from 'lodash/toLower'
import filter from 'lodash/filter'
import words from 'lodash/words'
import find from 'lodash/find'
import some from 'lodash/some'
import sortBy from 'lodash/sortBy'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import split from 'lodash/split'
import join from 'lodash/join'
import sample from 'lodash/sample'
import compact from 'lodash/compact'
import moment from './moment'
import forEach from 'lodash/forEach'
import { md5 } from './crypto'
import TimeWithOffset from './TimeWithOffset'

const serviceAccountRegex = /^system:serviceaccount:([^:]+):([^:]+)$/

export function emailToDisplayName (value) {
  if (value) {
    const names = map(words(replace(value, /@.*$/, '')), capitalize)
    const givenName = names.shift()
    return join(compact([join(names, ' '), givenName]), ', ')
  }
}

export function handleTextFieldDrop (textField, fileTypePattern, onDrop = (value) => {}) {
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

  const textarea = textField.$refs['input-slot']
  textarea.addEventListener('dragover', dragOver, false)
  textarea.addEventListener('drop', drop, false)
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

export function setDelayedInputFocus (vm, fieldName, { delay = 200, ...options } = {}) {
  setTimeout(() => {
    setInputFocus(vm, fieldName, options)
  }, delay)
}

export function setInputFocus (vm, fieldName, { noSelect = false } = {}) {
  const fieldRef = vm.$refs[fieldName]
  if (fieldRef) {
    if (noSelect) {
      fieldRef.focus()
    } else {
      const inputRef = fieldRef.$refs.input
      vm.$nextTick(() => {
        // Ensure that the input field has been rendered
        inputRef.focus()
        inputRef.select()
      })
    }
  }
}

export function fullDisplayName (username) {
  if (!username) {
    return ''
  }
  if (isEmail(username)) {
    return emailToDisplayName(username)
  }
  if (isServiceAccountUsername(username)) {
    const [namespace, serviceAccount] = split(username, ':', 4).slice(2)
    return `${namespace} / ${serviceAccount}`
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
  if (isServiceAccountUsername(username)) {
    const [, serviceAccount] = split(username, ':', 4).slice(2)
    return serviceAccount
  }
  return username
}

export function parseSize (value) {
  if (!value) {
    return 0
  }
  const sizeRegex = /^(\d+)Gi$/
  const result = sizeRegex.exec(value)
  if (result) {
    const [, sizeValue] = result
    return sizeValue
  }
  console.error(`Could not parse size ${value} as it does not match regex ^(\\d+)Gi$`)
  return 0
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
  if (isServiceAccountUsername(username)) {
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
  const hasChildren = ({ children }) => {
    return children && children.length
  }
  const hasMenu = ({ meta: { menu, projectScope } = {} }) => {
    return menu && (includeRoutesWithProjectScope || projectScope === false)
  }
  const traverseRoutes = routes => {
    for (const route of routes) {
      if (hasMenu(route)) {
        menuRoutes.push(route)
      } else if (hasChildren(route)) {
        traverseRoutes(route.children)
      }
    }
  }
  const menuRoutes = []
  traverseRoutes(router.options.routes)
  return menuRoutes
}

export function namespacedRoute (route, namespace) {
  return {
    name: routeName(route),
    params: {
      namespace
    }
  }
}

export function routeName (route) {
  if (route.name) {
    return route.name
  }
  const firstChild = head(route.children)
  if (firstChild && firstChild.name) {
    return firstChild.name
  }
  // eslint-disable-next-line no-console
  console.error('could not determine routeName')
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

export function isOwnSecret (infrastructureSecret) {
  return get(infrastructureSecret, 'metadata.secretRef.namespace') === get(infrastructureSecret, 'metadata.namespace')
}

export function getCreatedBy (metadata) {
  return get(metadata, ['annotations', 'gardener.cloud/created-by']) || get(metadata, ['annotations', 'garden.sapcloud.io/createdBy'])
}

export function getIssueSince (shootStatus) {
  const issueTimestamps = []
  const lastOperation = get(shootStatus, 'lastOperation', {})
  if (lastOperation.state === 'False') {
    issueTimestamps.push(lastOperation.lastUpdateTime)
  }
  forEach([...get(shootStatus, 'conditions', []), ...get(shootStatus, 'constraints', [])], readiness => {
    if (readiness.status !== 'True') {
      issueTimestamps.push(readiness.lastTransitionTime)
    }
  })
  forEach(get(shootStatus, 'lastErrors'), lastError => {
    issueTimestamps.push(lastError.lastUpdateTime)
  })
  return head(issueTimestamps.sort())
}

export function getProjectDetails (project) {
  const projectData = project.data || {}
  const projectMetadata = project.metadata || {}
  const projectName = projectMetadata.name || ''
  const owner = projectData.owner || ''
  const costObject = get(project, ['metadata', 'annotations', 'billing.gardener.cloud/costObject'])
  const creationTimestamp = projectMetadata.creationTimestamp
  const createdAt = getDateFormatted(creationTimestamp)
  const description = projectData.description || ''
  const createdBy = projectData.createdBy || ''
  const purpose = projectData.purpose || ''
  const staleSinceTimestamp = projectData.staleSinceTimestamp
  const staleAutoDeleteTimestamp = projectData.staleAutoDeleteTimestamp
  const phase = projectData.phase

  return {
    projectName,
    owner,
    costObject,
    createdAt,
    creationTimestamp,
    createdBy,
    description,
    purpose,
    staleSinceTimestamp,
    staleAutoDeleteTimestamp,
    phase
  }
}

export function isShootStatusHibernated (status) {
  return get(status, 'hibernated', false)
}

export function shootHasIssue (shoot) {
  return get(shoot, ['metadata', 'labels', 'shoot.gardener.cloud/status'], 'healthy') !== 'healthy'
}

export function isReconciliationDeactivated (metadata) {
  const ignoreDeprecated = get(metadata, ['annotations', 'shoot.garden.sapcloud.io/ignore'])
  const ignore = get(metadata, ['annotations', 'shoot.gardener.cloud/ignore'], ignoreDeprecated)
  return isTruthyValue(ignore)
}

export function isTruthyValue (value) {
  const truthyValues = ['1', 't', 'T', 'true', 'TRUE', 'True']
  return includes(truthyValues, value)
}

export function isStatusProgressing (metadata) {
  return get(metadata, ['labels', 'shoot.gardener.cloud/status']) === 'progressing'
}

export function isSelfTerminationWarning (expirationTimestamp) {
  if (!isValidTerminationDate(expirationTimestamp)) {
    return true
  }
  return new Date(expirationTimestamp) - new Date() < 24 * 60 * 60 * 1000 * 3 // 3 days
}

export function isValidTerminationDate (expirationTimestamp) {
  return expirationTimestamp && new Date(expirationTimestamp) > new Date()
}

export function isTypeDelete (lastOperation) {
  return get(lastOperation, 'type') === 'Delete'
}

export function isServiceAccountUsername (username) {
  return serviceAccountRegex.test(username)
}

export function isForeignServiceAccount (currentNamespace, username) {
  if (username && currentNamespace) {
    const { namespace } = parseServiceAccountUsername(username) || {}
    if (namespace && namespace !== currentNamespace) {
      return true
    }
  }
  return false
}

export function parseServiceAccountUsername (username) {
  if (!username) {
    return undefined
  }
  const [, namespace, name] = serviceAccountRegex.exec(username) || []
  return { namespace, name }
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

export function shortRandomString (length) {
  const start = 'abcdefghijklmnopqrstuvwxyz'
  const possible = start + '0123456789'
  let text = start.charAt(Math.floor(Math.random() * start.length))
  for (let i = 0; i < (length - 1); i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function selfTerminationDaysForSecret (secret) {
  const clusterLifetimeDays = function (quotas, scope) {
    return get(find(quotas, scope), 'spec.clusterLifetimeDays')
  }

  const quotas = get(secret, 'quotas')
  let terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'core.gardener.cloud/v1beta1', kind: 'Project' } } })
  if (!terminationDays) {
    terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'v1', kind: 'Secret' } } })
  }

  return terminationDays
}

export function purposesForSecret (secret) {
  return selfTerminationDaysForSecret(secret) ? ['evaluation'] : ['evaluation', 'development', 'testing', 'production']
}

export const shootAddonList = [
  {
    name: 'kubernetesDashboard',
    title: 'Dashboard',
    description: 'General-purpose web UI for Kubernetes clusters. Several high-profile attacks have shown weaknesses, so installation is not recommend, especially not for production clusters.',
    visible: true,
    enabled: false
  },
  {
    name: 'nginxIngress',
    title: 'Nginx Ingress',
    description: 'Default ingress-controller with static configuration and conservatively sized (cannot be changed). Therefore, it is not recommended for production clusters. We recommend alternatively to install an ingress-controller of your liking, which you can freely configure, program, and scale to your production needs.',
    visible: true,
    enabled: false
  }
]

function htmlToDocumentFragment (html) {
  const template = document.createElement('template')
  template.innerHTML = html.trim() // Never return a text node of whitespace as the result
  return template.content
}

function documentFragmentToHtml (documentFragment) {
  const div = document.createElement('div')
  div.appendChild(documentFragment.cloneNode(true))
  return div.innerHTML
}

export function transformHtml (html, transformToExternalLinks = true) {
  if (!html) {
    return undefined
  }

  const documentFragment = htmlToDocumentFragment(html)
  if (!documentFragment) {
    return html
  }

  const linkElements = documentFragment.querySelectorAll('a')
  linkElements.forEach(linkElement => {
    if (transformToExternalLinks) {
      linkElement.classList.add('text-decoration-none')
      linkElement.setAttribute('target', '_blank')
      linkElement.setAttribute('rel', 'noopener')
      const linkText = linkElement.innerHTML
      linkElement.innerHTML = `<span class="text-decoration-underline pr-1">${linkText}</span><em class="v-icon mdi mdi-open-in-new text-body-1"></em>`
    }
  })

  return documentFragmentToHtml(documentFragment)
}

export function randomMaintenanceBegin () {
  // randomize maintenance time window
  const hours = ['22', '23', '00', '01', '02', '03', '04', '05']
  const randomHour = sample(hours)
  return `${randomHour}:00`
}

export function maintenanceWindowWithBeginAndTimezone (beginTime, beginTimezone, windowSize = 60) {
  const maintenanceTimezone = new TimeWithOffset(beginTimezone)
  if (!maintenanceTimezone.isValid()) {
    return
  }
  const timezoneString = maintenanceTimezone.getTimezoneString({ colon: false })

  if (!beginTime) {
    return undefined
  }
  const beginMoment = moment(beginTime, 'HH:mm')
  if (!beginMoment || !beginMoment.isValid()) {
    return undefined
  }

  const begin = `${beginMoment.format('HHmm')}00${timezoneString}`
  const endMoment = beginMoment.add(windowSize, 'm')
  const end = `${endMoment.format('HHmm')}00${timezoneString}`
  return { begin, end }
}

export function defaultCriNameByKubernetesVersion (criNames, kubernetesVersion) {
  const criName = semver.lt(kubernetesVersion, '1.22.0')
    ? 'docker'
    : 'containerd'
  return includes(criNames, criName)
    ? criName
    : head(criNames)
}
export function isZonedCluster ({ cloudProviderKind, shootSpec, isNewCluster }) {
  switch (cloudProviderKind) {
    case 'azure':
      if (isNewCluster) {
        return true // new clusters are always created as zoned clusters by the dashboard
      }
      return get(shootSpec, 'provider.infrastructureConfig.zoned', false)
    case 'metal':
      return false // metal clusters do not support zones for worker groups
    default:
      return true
  }
}

export const MEMBER_ROLE_DESCRIPTORS = [
  {
    name: 'admin',
    displayName: 'Admin'
  },
  {
    name: 'viewer',
    displayName: 'Viewer'
  },
  {
    name: 'uam',
    displayName: 'UAM'
  },
  {
    name: 'serviceaccountmanager',
    displayName: 'Service Account Manager'
  },
  {
    name: 'owner',
    displayName: 'Owner',
    notEditable: true,
    tooltip: 'You can change the project owner on the administration page'
  }
]

function includesNameOrAll (list, name) {
  return includes(list, name) || includes(list, '*')
}

export function canI ({ resourceRules } = {}, verb, apiGroup, resouce, resourceName) {
  if (isEmpty(resourceRules)) {
    return false
  }

  resourceRules = filter(resourceRules, ({ apiGroups }) => includesNameOrAll(apiGroups, apiGroup))
  resourceRules = filter(resourceRules, ({ resources }) => includesNameOrAll(resources, resouce))
  resourceRules = filter(resourceRules, ({ verbs }) => includesNameOrAll(verbs, verb))
  resourceRules = filter(resourceRules, ({ resourceNames }) => isEmpty(resourceNames) || includesNameOrAll(resourceNames, resourceName))

  return !isEmpty(resourceRules)
}

export const TargetEnum = {
  GARDEN: 'garden',
  CONTROL_PLANE: 'cp',
  SHOOT: 'shoot'
}

export function targetText (target) {
  switch (target) {
    case TargetEnum.CONTROL_PLANE:
      return 'Control Plane'
    case TargetEnum.SHOOT:
      return 'Cluster'
    case TargetEnum.GARDEN:
      return 'Garden Cluster'
    default:
      return undefined
  }
}

export function selectedImageIsNotLatest (machineImage, machineImages) {
  const { version: testImageVersion, vendorName: testVendor } = machineImage

  return some(machineImages, ({ version, vendorName, isSupported }) => {
    return testVendor === vendorName && semver.gt(version, testImageVersion) && isSupported
  })
}

export const availableKubernetesUpdatesCache = new Map()

export const UNKNOWN_EXPIRED_TIMESTAMP = '1970-01-01T00:00:00Z'

export function sortedRoleDisplayNames (roleNames) {
  const displayNames = filter(MEMBER_ROLE_DESCRIPTORS, role => includes(roleNames, role.name))
  return sortBy(displayNames, 'displayName')
}

export function mapTableHeader (headers, valueKey) {
  const obj = {}
  for (const { value: key, [valueKey]: value } of headers) {
    obj[key] = value
  }
  return obj
}

export function isHtmlColorCode (value) {
  return /^#([a-f0-9]{6}|[a-f0-9]{3})$/i.test(value)
}
