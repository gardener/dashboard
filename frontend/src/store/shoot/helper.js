//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  shortRandomString,
  purposesForSecret,
  shootAddonList,
  maintenanceWindowWithBeginAndTimezone,
  randomMaintenanceBegin,
  isTruthyValue,
  isStatusProgressing,
  isReconciliationDeactivated,
  getCreatedBy,
  isShootStatusHibernated,
  getIssueSince,
} from '@/utils'
import {
  isUserError,
  isTemporaryError,
  errorCodesFromArray,
} from '@/utils/errorCodes'
import {
  getSpecTemplate,
  getDefaultZonesNetworkConfiguration,
  getControlPlaneZone,
} from '@/utils/createShoot'

import {
  find,
  includes,
  set,
  head,
  get,
  isEmpty,
  map,
  sample,
  omit,
  filter,
  some,
  startsWith,
  toLower,
  join,
  padStart,
  orderBy,
} from '@/lodash'

export const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/

const tokenizePattern = /(-?"([^"]|"")*"|\S+)/g

export function tokenizeSearch (text) {
  const tokens = typeof text === 'string'
    ? text.match(tokenizePattern)
    : null
  return tokens || []
}

export class SearchQuery {
  constructor (terms) {
    this.terms = terms
  }

  matches (values) {
    for (const term of this.terms) {
      const found = !!find(values, value => term.exact ? value === term.value : includes(value, term.value))
      if ((!found && !term.exclude) || (found && term.exclude)) {
        return false
      }
    }
    return true
  }
}

export function parseSearch (text) {
  const terms = []
  for (let value of tokenizeSearch(text)) {
    let exclude = false
    if (value[0] === '-') {
      exclude = true
      value = value.substring(1)
    }
    let exact = false
    const end = value.length - 1
    if (value[0] === '"' && value[end] === '"') {
      exact = true
      value = value.substring(1, end).replace(/""/g, '"')
    }
    if (value) {
      terms.push({
        value,
        exact,
        exclude,
      })
    }
  }
  return new SearchQuery(terms)
}

export const constants = Object.freeze({
  DEFINED: 0,
  LOADING: 1,
  OPENING: 2,
  OPEN: 3,
  CLOSING: 4,
  CLOSED: 5,
})

export function createShootResource (context) {
  const {
    logger,
    appStore,
    authzStore,
    configStore,
    secretStore,
    cloudProfileStore,
    gardenerExtensionStore,
  } = context

  const shootResource = {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: {
      namespace: authzStore.namespace,
    },
  }

  if (!cloudProfileStore.sortedInfrastructureKindList.length) {
    logger.warn('Could not reset new shoot resource as there is no supported cloud profile')
    return
  }

  const infrastructureKind = head(cloudProfileStore.sortedInfrastructureKindList)
  const cloudProfileName = get(head(cloudProfileStore.cloudProfilesByCloudProviderKind(infrastructureKind)), 'metadata.name')
  const defaultNodesCIDR = cloudProfileStore.getDefaultNodesCIDR({ cloudProfileName })

  set(shootResource, 'spec', getSpecTemplate(infrastructureKind, defaultNodesCIDR))
  set(shootResource, 'spec.cloudProfileName', cloudProfileName)

  const secret = head(secretStore.infrastructureSecretsByCloudProfileName(cloudProfileName))
  set(shootResource, 'spec.secretBindingName', get(secret, 'metadata.name'))

  let region = head(cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName))
  if (!region) {
    const seedDeterminationStrategySameRegion = configStore.seedCandidateDeterminationStrategy === 'SameRegion'
    if (!seedDeterminationStrategySameRegion) {
      region = head(cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName))
    }
  }
  set(shootResource, 'spec.region', region)

  const networkingType = head(gardenerExtensionStore.networkingTypeList)
  set(shootResource, 'spec.networking.type', networkingType)

  const loadBalancerProviderName = head(cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region }))
  if (!isEmpty(loadBalancerProviderName)) {
    set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider', loadBalancerProviderName)
  }
  const secretDomain = get(secret, 'data.domainName')
  const floatingPoolName = head(cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain }))
  if (!isEmpty(floatingPoolName)) {
    set(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName', floatingPoolName)
  }

  const allLoadBalancerClassNames = cloudProfileStore.loadBalancerClassNamesByCloudProfileName(cloudProfileName)
  if (!isEmpty(allLoadBalancerClassNames)) {
    const defaultLoadBalancerClassName = includes(allLoadBalancerClassNames, 'default')
      ? 'default'
      : head(allLoadBalancerClassNames)
    const loadBalancerClasses = [{
      name: defaultLoadBalancerClassName,
    }]
    set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses', loadBalancerClasses)
  }

  const partitionIDs = cloudProfileStore.partitionIDsByCloudProfileNameAndRegion({ cloudProfileName, region })
  const partitionID = head(partitionIDs)
  if (!isEmpty(partitionID)) {
    set(shootResource, 'spec.provider.infrastructureConfig.partitionID', partitionID)
  }
  const firewallImages = cloudProfileStore.firewallImagesByCloudProfileName(cloudProfileName)
  const firewallImage = head(firewallImages)
  if (!isEmpty(firewallImage)) {
    set(shootResource, 'spec.provider.infrastructureConfig.firewall.image', firewallImage)
  }
  const firewallSizes = map(cloudProfileStore.firewallSizesByCloudProfileNameAndRegion({ cloudProfileName, region }), 'name')
  const firewallSize = head(firewallSizes)
  if (!isEmpty(firewallSize)) {
    set(shootResource, 'spec.provider.infrastructureConfig.firewall.size', firewallImage)
  }
  const allFirewallNetworks = cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({ cloudProfileName, partitionID })
  const firewallNetworks = find(allFirewallNetworks, { key: 'internet' })
  if (!isEmpty(firewallNetworks)) {
    set(shootResource, 'spec.provider.infrastructureConfig.firewall.networks', firewallNetworks)
  }

  const name = shortRandomString(10)
  set(shootResource, 'metadata.name', name)

  const purpose = head(purposesForSecret(secret))
  set(shootResource, 'spec.purpose', purpose)

  const kubernetesVersion = cloudProfileStore.defaultKubernetesVersionForCloudProfileName(cloudProfileName) || {}
  set(shootResource, 'spec.kubernetes.version', kubernetesVersion.version)
  set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', false)

  const allZones = cloudProfileStore.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
  const zones = allZones.length ? [sample(allZones)] : undefined
  const zonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(zones, infrastructureKind, allZones.length, defaultNodesCIDR)
  if (zonesNetworkConfiguration) {
    set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
  }

  const newWorker = cloudProfileStore.generateWorker(zones, cloudProfileName, region, kubernetesVersion.version)
  const worker = omit(newWorker, ['id', 'isNew'])
  const workers = [worker]
  set(shootResource, 'spec.provider.workers', workers)

  const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind)
  if (controlPlaneZone) {
    set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
  }

  const addons = {}
  const visibleShootAddonList = filter(shootAddonList, 'visible')
  for (const { name, enabled } of visibleShootAddonList) {
    addons[name] = { enabled }
  }

  set(shootResource, 'spec.addons', addons)

  const { begin, end } = maintenanceWindowWithBeginAndTimezone(randomMaintenanceBegin(), appStore.timezone)
  const maintenance = {
    timeWindow: {
      begin,
      end,
    },
    autoUpdate: {
      kubernetesVersion: true,
      machineImageVersion: true,
    },
  }
  set(shootResource, 'spec.maintenance', maintenance)

  let hibernationSchedule = get(configStore.defaultHibernationSchedule, purpose)
  hibernationSchedule = map(hibernationSchedule, schedule => {
    return {
      ...schedule,
      location: appStore.location,
    }
  })
  set(shootResource, 'spec.hibernation.schedules', hibernationSchedule)

  return shootResource
}

export function onlyAllShootsWithIssues (state, context) {
  const {
    authzStore,
  } = context
  return authzStore.namespace === '_all' && get(state.shootListFilters, 'onlyShootsWithIssues', true)
}

export function getFilteredUids (state, context) {
  const {
    projectStore,
    ticketStore,
    configStore,
  } = context

  // filter function
  const notProgressing = item => {
    return !isStatusProgressing(get(item, 'metadata', {}))
  }

  const noUserError = item => {
    const ignoreIssues = isTruthyValue(get(item, ['metadata', 'annotations', 'dashboard.gardener.cloud/ignore-issues']))
    if (ignoreIssues) {
      return false
    }
    const lastErrors = get(item, 'status.lastErrors', [])
    const allLastErrorCodes = errorCodesFromArray(lastErrors)
    if (isTemporaryError(allLastErrorCodes)) {
      return false
    }
    const conditions = get(item, 'status.conditions', [])
    const allConditionCodes = errorCodesFromArray(conditions)

    const constraints = get(item, 'status.constraints', [])
    const allConstraintCodes = errorCodesFromArray(constraints)

    return !(isUserError(allLastErrorCodes) || isUserError(allConditionCodes) || isUserError(allConstraintCodes))
  }

  const reconciliationNotDeactivated = item => {
    return !isReconciliationDeactivated(get(item, 'metadata', {}))
  }

  const hasTicketsWithoutHideLabel = item => {
    const hideClustersWithLabels = get(configStore.ticket, 'hideClustersWithLabels')
    if (!hideClustersWithLabels) {
      return true
    }
    const metadata = get(item, 'metadata', {})
    metadata.projectName = projectStore.projectNameByNamespace(metadata)
    const ticketsForCluster = ticketStore.issues(metadata)
    if (!ticketsForCluster.length) {
      return true
    }

    const ticketsWithoutHideLabel = filter(ticketsForCluster, ticket => {
      const labelNames = map(get(ticket, 'data.labels'), 'name')
      const ticketHasHideLabel = some(hideClustersWithLabels, hideClustersWithLabel => includes(labelNames, hideClustersWithLabel))
      return !ticketHasHideLabel
    })
    return ticketsWithoutHideLabel.length > 0
  }

  // list of active filter function
  const predicates = []
  if (onlyAllShootsWithIssues(state, context)) {
    if (get(state, 'shootListFilters.progressing', false)) {
      predicates.push(notProgressing)
    }
    if (get(state, 'shootListFilters.noOperatorAction', false)) {
      predicates.push(noUserError)
    }
    if (get(state, 'shootListFilters.deactivatedReconciliation', false)) {
      predicates.push(reconciliationNotDeactivated)
    }
    if (get(state, 'shootListFilters.hideTicketsWithLabel', false)) {
      predicates.push(hasTicketsWithoutHideLabel)
    }
  }

  return Object.values(state.shoots)
    .filter(item => {
      for (const predicate of predicates) {
        if (!predicate(item)) {
          return false
        }
      }
      return true
    })
    .map(item => item.metadata.uid)
}

export function getRawVal (context, item, column) {
  const {
    projectStore,
    ticketStore,
  } = context

  const metadata = item.metadata
  const spec = item.spec
  switch (column) {
    case 'purpose':
      return get(spec, 'purpose')
    case 'lastOperation':
      return get(item, 'status.lastOperation')
    case 'createdAt':
      return metadata.creationTimestamp
    case 'createdBy':
      return getCreatedBy(metadata)
    case 'project':
      return projectStore.projectNameByNamespace(metadata)
    case 'k8sVersion':
      return get(spec, 'kubernetes.version')
    case 'infrastructure':
      return `${get(spec, 'provider.type')} ${get(spec, 'region')}`
    case 'seed':
      return get(item, 'spec.seedName')
    case 'ticketLabels': {
      const labels = ticketStore.labels({
        projectName: projectStore.projectNameByNamespace(metadata),
        name: metadata.name,
      })
      return join(map(labels, 'name'), ' ')
    }
    case 'errorCodes':
      return join(errorCodesFromArray(get(item, 'status.lastErrors', [])), ' ')
    case 'controlPlaneHighAvailability':
      return get(spec, 'controlPlane.highAvailability.failureTolerance.type')
    case 'issueSince':
      return getIssueSince(item.status) || 0
    case 'technicalId':
      return item.status?.technicalID
    case 'workers':
      return item.spec.provider.workers?.length ?? 0
    default: {
      if (startsWith(column, 'Z_')) {
        const path = get(projectStore.shootCustomFields, [column, 'path'])
        return get(item, path)
      }
      return metadata[column]
    }
  }
}

export function getSortVal (context, item, sortBy) {
  const {
    projectStore,
    ticketStore,
  } = context

  const purposeValue = {
    infrastructure: 0,
    production: 1,
    development: 2,
    evaluation: 3,
  }
  const value = getRawVal(context, item, sortBy)
  const status = item.status
  switch (sortBy) {
    case 'purpose':
      return purposeValue[value] ?? 4
    case 'k8sVersion':
      return (value || '0.0.0').split('.').map(i => padStart(i, 4, '0')).join('.')
    case 'lastOperation': {
      const operation = value || {}
      const lastErrors = item.status?.lastErrors ?? []
      const isError = operation.state === 'Failed' || lastErrors.length
      const ignoredFromReconciliation = isReconciliationDeactivated(item.metadata ?? {})

      if (ignoredFromReconciliation) {
        return isError
          ? 400
          : 450
      }

      const userError = isUserError(errorCodesFromArray(lastErrors))
      const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress

      if (userError) {
        return inProgress
          ? '3' + padStart(operation.progress, 2, '0')
          : 200
      }
      if (isError) {
        return inProgress
          ? '1' + padStart(operation.progress, 2, '0')
          : 0
      }
      return inProgress
        ? '6' + padStart(operation.progress, 2, '0')
        : isShootStatusHibernated(status)
          ? 500
          : 700
    }
    case 'ticket': {
      const metadata = item.metadata
      return ticketStore.latestUpdated({
        projectName: projectStore.projectNameByNamespace(metadata),
        name: metadata.name,
      })
    }
    default:
      return toLower(value)
  }
}

export function searchItemsFn (state, context) {
  const {
    projectStore,
  } = context

  const searchableCustomFields = computed(() => {
    return filter(projectStore.shootCustomFieldList, ['searchable', true])
  })

  let searchQuery
  let searchQueryTerms = []
  let lastSearch

  return (search, item) => {
    if (search !== lastSearch) {
      lastSearch = search
      searchQuery = parseSearch(search)
      searchQueryTerms = map(searchQuery.terms, 'value')
    }

    if (searchQueryTerms.includes('workerless')) {
      if (getRawVal(context, item, 'workers') === 0) {
        return true
      }
    }

    const values = [
      getRawVal(context, item, 'name'),
      getRawVal(context, item, 'infrastructure'),
      getRawVal(context, item, 'seed'),
      getRawVal(context, item, 'project'),
      getRawVal(context, item, 'createdBy'),
      getRawVal(context, item, 'purpose'),
      getRawVal(context, item, 'k8sVersion'),
      getRawVal(context, item, 'ticketLabels'),
      getRawVal(context, item, 'errorCodes'),
      getRawVal(context, item, 'controlPlaneHighAvailability'),
      ...map(searchableCustomFields.value, ({ key }) => getRawVal(context, item, key)),
    ]

    return searchQuery.matches(values)
  }
}

export function sortItemsFn (state, context) {
  const {
    configStore,
  } = context

  return (items, sortByArr) => {
    if (state.focusMode) {
      // no need to sort in focus mode sorting is freezed and filteredItems return items in last sorted order
      return items
    }
    const sortByObj = head(sortByArr)
    if (!sortByObj || !sortByObj.key) {
      return items
    }
    const sortBy = sortByObj.key
    const sortOrder = sortByObj.order

    switch (sortBy) {
      case 'k8sVersion': {
        return orderBy(items, [item => getSortVal(context, item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
      }
      case 'readiness': {
        const hideProgressingClusters = get(state.shootListFilters, 'progressing', false)
        return orderBy(items, item => {
          const errorGroups = map(item.status?.conditions, itemCondition => {
            const isErrorCondition = (itemCondition?.status !== 'True' &&
              (!hideProgressingClusters || itemCondition?.status !== 'Progressing'))
            if (!isErrorCondition) {
              return {
                sortOrder: `${Number.MAX_SAFE_INTEGER}`,
                lastTransitionTime: itemCondition.lastTransitionTime,
              }
            }
            const type = itemCondition.type
            const condition = configStore.conditionForType(type)
            return {
              sortOrder: condition.sortOrder,
              lastTransitionTime: itemCondition.lastTransitionTime,
            }
          })
          const { sortOrder, lastTransitionTime } = head(orderBy(errorGroups, ['sortOrder']))
          return [sortOrder, lastTransitionTime, 'metadata.name']
        },
        [sortOrder, sortOrder, 'asc'])
      }
      default: {
        return orderBy(items, [item => getSortVal(context, item, sortBy), 'metadata.name'], [sortOrder, 'asc'])
      }
    }
  }
}

export function shootHasIssue (object) {
  return get(object, ['metadata', 'labels', 'shoot.gardener.cloud/status'], 'healthy') !== 'healthy'
}

//  Updates subscription state, ensuring consistency with transition states.
export function setSubscriptionState (state, value) {
  if (value === constants.OPEN && state.subscriptionState !== constants.OPENING) {
    return
  }
  if (value === constants.CLOSED && state.subscriptionState !== constants.CLOSING) {
    return
  }
  state.subscriptionState = value
  state.subscriptionError = null
}

export function setSubscriptionError (state, err) {
  if (err) {
    const name = err.name
    const statusCode = get(err, 'response.status', 500)
    const message = get(err, 'response.data.message', err.message)
    const reason = get(err, 'response.data.reason')
    const code = get(err, 'response.data.code', 500)
    state.subscriptionError = {
      name,
      statusCode,
      message,
      code,
      reason,
    }
  } else {
    state.subscriptionError = null
  }
}
