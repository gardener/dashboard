//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Base64 } from 'js-base64'
import semver from 'semver'
import {
  nextTick,
  unref,
} from 'vue'

import { useLogger } from '@/composables/useLogger'

import moment from './moment'
import {
  md5,
  hash,
} from './crypto'
import TimeWithOffset from './TimeWithOffset'

import {
  capitalize,
  replace,
  get,
  head,
  map,
  toLower,
  filter,
  words,
  find,
  some,
  sortBy,
  isEmpty,
  includes,
  split,
  join,
  sample,
  compact,
  forEach,
  omit,
} from '@/lodash'

const serviceAccountRegex = /^system:serviceaccount:([^:]+):([^:]+)$/
const sizeRegex = /^(\d+)Gi$/
const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
const colorCodeRegex = /^#([a-f0-9]{6}|[a-f0-9]{3})$/i
const magnitudeNumberSuffixRegex = /^(\d+(?:\.\d*)?)([kmbt]?)$/i
const versionRegex = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.\d+)*([-+].+)?$/

const logger = useLogger()

export function emailToDisplayName (value) {
  if (value) {
    const names = map(words(replace(value, /@.*$/, '')), capitalize)
    const givenName = names.shift()
    return join(compact([join(names, ' '), givenName]), ', ')
  }
}

export function handleTextFieldDrop (textField, fileTypePattern, onDrop = () => {}) {
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

export function getErrorMessages (property) {
  return property.$errors.map(e => e.$message)
}

export function setDelayedInputFocus (...args) {
  const options = typeof args[1] === 'string'
    ? args[2]
    : args[1]
  const delay = options?.delay ?? 200
  setTimeout(() => setInputFocus(...args), delay)
}

export function setInputFocus (vm, fieldName, options) {
  if (typeof fieldName === 'string') {
    vm = vm.$refs[fieldName]
  } else {
    vm = unref(vm)
    options = fieldName
  }
  const noSelect = options?.noSelect === true
  if (vm) {
    if (noSelect) {
      vm.focus()
    } else {
      (async vm => {
        await nextTick()
        // Ensure that the input field has been rendered
        vm.focus()
        vm.select()
      })(vm)
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
  const result = sizeRegex.exec(value)
  if (result) {
    const [, sizeValue] = result
    return parseInt(sizeValue, 10)
  }
  logger.error(`Could not parse size ${value} as it does not match regex ^(\\d+)Gi$`)
  return 0
}

export function isEmail (value) {
  return emailRegex.test(value)
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
      namespace,
    },
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
  logger.error('could not determine routeName')
}

export function getDateFormatted (timestamp) {
  if (!timestamp) {
    return undefined
  }
  return moment(timestamp).format('YYYY-MM-DD')
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
  }
  return moment(time).from(fromTime, withoutSuffix)
}

export function getTimeStringTo (time, toTime, withoutPrefix = false) {
  if (!time) {
    return undefined
  }
  return moment(time).to(toTime, withoutPrefix)
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

export function getProjectDetails (project = {}) {
  const projectData = project.data || {}
  const projectMetadata = project.metadata || {}
  const projectName = projectMetadata.name || ''
  const owner = projectData.owner || ''
  const costObject = get(project, ['metadata', 'annotations', 'billing.gardener.cloud/costObject'], '')
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
    phase,
  }
}

export function isShootStatusHibernated (status) {
  return get(status, 'hibernated', false)
}

export function isReconciliationDeactivated (metadata) {
  const ignore = get(metadata, ['annotations', 'shoot.gardener.cloud/ignore'])
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
  return !!expirationTimestamp && new Date(expirationTimestamp) > new Date()
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
  return Base64.encode(input)
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
  return selfTerminationDaysForSecret(secret)
    ? ['evaluation']
    : ['evaluation', 'development', 'testing', 'production']
}

export const shootAddonList = [
  {
    name: 'kubernetesDashboard',
    title: 'Dashboard',
    description: 'General-purpose web UI for Kubernetes clusters. Several high-profile attacks have shown weaknesses, so installation is not recommend, especially not for production clusters.',
    visible: true,
    enabled: false,
  },
  {
    name: 'nginxIngress',
    title: 'Nginx Ingress',
    description: 'Default ingress-controller with static configuration and conservatively sized (cannot be changed). Therefore, it is not recommended for production clusters. We recommend alternatively to install an ingress-controller of your liking, which you can freely configure, program, and scale to your production needs.',
    visible: true,
    enabled: false,
  },
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
      linkElement.classList.add('text-anchor', 'text-decoration-none')
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

export function getDurationInMinutes (begin, end) {
  const beginMoment = moment.utc(begin, 'HH:mm')
  let endMoment = moment.utc(end, 'HH:mm')
  if (!beginMoment.isValid() || !endMoment.isValid()) {
    return undefined
  }
  if (endMoment.isBefore(beginMoment)) {
    endMoment = endMoment.add(1, 'day')
  }

  return endMoment.diff(beginMoment, 'minutes')
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
    case 'local':
      return false // local development provider does not support zones
    default:
      return true
  }
}

export const MEMBER_ROLE_DESCRIPTORS = [
  {
    name: 'admin',
    displayName: 'Admin',
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
  },
  {
    name: 'uam',
    displayName: 'UAM',
  },
  {
    name: 'serviceaccountmanager',
    displayName: 'Service Account Manager',
  },
  {
    name: 'owner',
    displayName: 'Owner',
    notEditable: true,
    tooltip: 'You can change the project owner on the administration page',
  },
]

function includesNameOrAll (list, name) {
  return includes(list, name) || includes(list, '*')
}

export function canI (subjectRules, verb, apiGroup, resouce, resourceName) {
  let { resourceRules } = unref(subjectRules) ?? {}
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
  SHOOT: 'shoot',
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

const allowedSemverDiffs = {
  patch: ['patch'],
  minor: ['patch', 'minor'],
  major: ['patch', 'minor', 'major'],
}

export function machineImageHasUpdate (machineImage, machineImages) {
  let { updateStrategy } = machineImage
  if (!allowedSemverDiffs[updateStrategy]) {
    updateStrategy = 'major'
  }
  return some(machineImages, ({ version, vendorName, isSupported }) => {
    return isSupported &&
      machineImage.vendorName === vendorName &&
      semver.gt(version, machineImage.version) &&
      allowedSemverDiffs[updateStrategy].includes(semver.diff(version, machineImage.version))
  })
}

export function machineVendorHasSupportedVersion (machineImage, machineImages) {
  const { vendorName, isSupported } = machineImage
  return some(machineImages, { vendorName, isSupported })
}

export const UNKNOWN_EXPIRED_TIMESTAMP = '1970-01-01T00:00:00Z'

export function sortedRoleDisplayNames (roleNames) {
  const displayNames = filter(MEMBER_ROLE_DESCRIPTORS, role => includes(roleNames, role.name))
  return sortBy(displayNames, 'displayName')
}

export function mapTableHeader (headers, valueKey) {
  const obj = {}
  for (const { key, [valueKey]: value } of headers) {
    obj[key] = value
  }
  return obj
}

export function isHtmlColorCode (value) {
  return colorCodeRegex.test(value)
}

export class Shortcut {
  constructor (shortcut, unverified = true) {
    Object.assign(this, shortcut)
    Object.defineProperty(this, 'id', {
      value: hash(shortcut),
    })
    Object.defineProperty(this, 'unverified', {
      value: unverified,
    })
  }
}

export function omitKeysWithSuffix (obj, suffix) {
  const keys = Object.keys(obj).filter(key => key.endsWith(suffix))
  return omit(obj, keys)
}

export function parseNumberWithMagnitudeSuffix (abbreviatedNumber) {
  const [, number, suffix] = magnitudeNumberSuffixRegex.exec(abbreviatedNumber) ?? []
  if (!number) {
    logger.error(`Failed to parse ${abbreviatedNumber} because it doesn't follow the required format: a number optionally with a decimal, followed by an optional magnitude suffix ('k', 'm', 'b', 't').`)
    return null
  }

  const suffixFactors = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }
  const factor = suffixFactors[suffix?.toLowerCase()] ?? 1
  return Number(number) * factor
}

export function normalizeVersion (version) {
  const [match, major, minor = '0', patch = '0', suffix = ''] = versionRegex.exec(version) ?? []
  if (match) {
    return [major, minor, patch].map(Number).join('.') + suffix
  }
}

export default {
  emailToDisplayName,
  handleTextFieldDrop,
  getErrorMessages,
  setDelayedInputFocus,
  setInputFocus,
  fullDisplayName,
  displayName,
  parseSize,
  isEmail,
  gravatarUrlGeneric,
  gravatarUrlMp,
  gravatarUrlRetro,
  gravatarUrlIdenticon,
  gravatarUrlRobohash,
  gravatarUrl,
  routes,
  namespacedRoute,
  routeName,
  getDateFormatted,
  getTimestampFormatted,
  getTimeStringFrom,
  getTimeStringTo,
  isOwnSecret,
  getCreatedBy,
  getIssueSince,
  getProjectDetails,
  isShootStatusHibernated,
  isReconciliationDeactivated,
  isTruthyValue,
  isStatusProgressing,
  isSelfTerminationWarning,
  isValidTerminationDate,
  isTypeDelete,
  isServiceAccountUsername,
  isForeignServiceAccount,
  parseServiceAccountUsername,
  encodeBase64,
  encodeBase64Url,
  shortRandomString,
  selfTerminationDaysForSecret,
  purposesForSecret,
  shootAddonList,
  htmlToDocumentFragment,
  documentFragmentToHtml,
  transformHtml,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  getDurationInMinutes,
  defaultCriNameByKubernetesVersion,
  isZonedCluster,
  includesNameOrAll,
  canI,
  targetText,
  sortedRoleDisplayNames,
  mapTableHeader,
  isHtmlColorCode,
  omitKeysWithSuffix,
  parseNumberWithMagnitudeSuffix,
  normalizeVersion,
}
