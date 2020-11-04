//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'
import hash from 'object-hash'

import EmitterWrapper from '@/utils/Emitter'
import {
  gravatarUrlGeneric,
  displayName,
  fullDisplayName,
  getDateFormatted,
  canI,
  getProjectName,
  TargetEnum
} from '@/utils'
import { getSubjectRules, getKubeconfigData, listProjectTerminalShortcuts } from '@/utils/api'
import reduce from 'lodash/reduce'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import filter from 'lodash/filter'
import uniq from 'lodash/uniq'
import uniqBy from 'lodash/uniqBy'
import get from 'lodash/get'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import some from 'lodash/some'
import concat from 'lodash/concat'
import compact from 'lodash/compact'
import merge from 'lodash/merge'
import difference from 'lodash/difference'
import forEach from 'lodash/forEach'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import head from 'lodash/head'
import pick from 'lodash/pick'
import sortBy from 'lodash/sortBy'
import lowerCase from 'lodash/lowerCase'
import cloneDeep from 'lodash/cloneDeep'
import max from 'lodash/max'
import template from 'lodash/template'
import toPairs from 'lodash/toPairs'
import fromPairs from 'lodash/fromPairs'
import isEqual from 'lodash/isEqual'
import moment from 'moment-timezone'

import shoots from './modules/shoots'
import cloudProfiles from './modules/cloudProfiles'
import seeds from './modules/seeds'
import projects from './modules/projects'
import draggable from './modules/draggable'
import members from './modules/members'
import infrastructureSecrets from './modules/infrastructureSecrets'
import tickets from './modules/tickets'
import semver from 'semver'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'

// plugins
const plugins = []
if (debug) {
  plugins.push(createLogger())
}

// initial state
const state = {
  cfg: null,
  kubeconfigData: null,
  ready: false,
  namespace: null,
  subjectRules: { // selfSubjectRules for state.namespace
    resourceRules: null,
    nonResourceRules: null,
    incomplete: false,
    evaluationError: null
  },
  onlyShootsWithIssues: true,
  sidebar: true,
  user: null,
  redirectPath: null,
  loading: false,
  alert: null,
  alertBanner: null,
  shootsLoading: false,
  websocketConnectionError: null,
  localTimezone: moment.tz.guess(),
  focusedElementId: null,
  splitpaneResize: null,
  splitpaneLayouts: {},
  projectTerminalShortcuts: null,
  conditionCache: {
    APIServerAvailable: {
      displayName: 'API Server',
      shortName: 'API',
      description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.'
    },
    ControlPlaneHealthy: {
      displayName: 'Control Plane',
      shortName: 'CP',
      description: 'Indicates whether all control plane components are up and running.',
      showAdminOnly: true
    },
    EveryNodeReady: {
      displayName: 'Nodes',
      shortName: 'N',
      description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.'
    },
    SystemComponentsHealthy: {
      displayName: 'System Components',
      shortName: 'SC',
      description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.'
    }
  }
}

class Shortcut {
  constructor (shortcut, unverified = true) {
    Object.assign(this, shortcut)
    Object.defineProperty(this, 'id', {
      value: hash(shortcut)
    })
    Object.defineProperty(this, 'unverified', {
      value: unverified
    })
  }
}

const getFilterValue = (state) => {
  return state.namespace === '_all' && state.onlyShootsWithIssues ? 'issues' : null
}

const vendorNameFromImageName = imageName => {
  const lowerCaseName = lowerCase(imageName)
  if (lowerCaseName.includes('coreos')) {
    return 'coreos'
  } else if (lowerCaseName.includes('ubuntu')) {
    return 'ubuntu'
  } else if (lowerCaseName.includes('gardenlinux')) {
    return 'gardenlinux'
  } else if (lowerCaseName.includes('suse') && lowerCaseName.includes('jeos')) {
    return 'suse-jeos'
  } else if (lowerCaseName.includes('suse') && lowerCaseName.includes('chost')) {
    return 'suse-chost'
  }
  return undefined
}

const vendorNeedsLicense = vendorName => {
  return vendorName === 'suse-jeos' || vendorName === 'suse-chost'
}

const matchesPropertyOrEmpty = (path, srcValue) => {
  return object => {
    const objValue = get(object, path)
    if (!objValue) {
      return true
    }
    return isEqual(objValue, srcValue)
  }
}

const isValidRegion = (getters, cloudProfileName, cloudProviderKind) => {
  return region => {
    if (cloudProviderKind === 'azure') {
      // Azure regions may not be zoned, need to filter these out for the dashboard
      return !!getters.zonesByCloudProfileNameAndRegion({ cloudProfileName, region }).length
    }

    // Filter regions that are not defined in cloud profile
    const cloudProfile = getters.cloudProfileByName(cloudProfileName)
    if (cloudProfile) {
      return some(cloudProfile.data.regions, ['name', region])
    }

    return true
  }
}

function mapOptionForInput (optionValue, shootResource) {
  const key = get(optionValue, 'key')
  if (!key) {
    return
  }

  const isSelectedByDefault = false
  const inputInverted = get(optionValue, 'input.inverted', false)
  const defaultValue = inputInverted ? !isSelectedByDefault : isSelectedByDefault
  const rawValue = get(shootResource, ['metadata', 'annotations', key], `${defaultValue}`) === 'true'
  const value = inputInverted ? !rawValue : rawValue

  const option = {
    value
  }
  return [key, option]
}

function mapAccessRestrictionForInput (accessRestrictionDefinition, shootResource) {
  const key = get(accessRestrictionDefinition, 'key')
  if (!key) {
    return
  }

  const isSelectedByDefault = false
  const inputInverted = get(accessRestrictionDefinition, 'input.inverted', false)
  const defaultValue = inputInverted ? !isSelectedByDefault : isSelectedByDefault
  const rawValue = get(shootResource, ['spec', 'seedSelector', 'matchLabels', key], `${defaultValue}`) === 'true'
  const value = inputInverted ? !rawValue : rawValue

  let optionsPair = map(get(accessRestrictionDefinition, 'options'), option => mapOptionForInput(option, shootResource))
  optionsPair = compact(optionsPair)
  const options = fromPairs(optionsPair)

  const accessRestriction = {
    value,
    options
  }
  return [key, accessRestriction]
}

function mapOptionForDisplay ({ optionDefinition, option: { value } }) {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description
    }
  } = optionDefinition

  const optionVisible = visibleIf === value
  if (!optionVisible) {
    return undefined // skip
  }

  return {
    key,
    title,
    description
  }
}

function mapAccessRestrictionForDisplay ({ definition, accessRestriction: { value, options } }) {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description
    },
    options: optionDefinitions
  } = definition

  const accessRestrictionVisible = visibleIf === value
  if (!accessRestrictionVisible) {
    return undefined // skip
  }

  const optionsList = compact(map(optionDefinitions, optionDefinition => mapOptionForDisplay({ optionDefinition: optionDefinition, option: options[optionDefinition.key] })))

  return {
    key,
    title,
    description,
    options: optionsList
  }
}

// Return first item with classification supported, if no item has classification supported
// return first item with classifiction undefined, if no item matches these requirements,
// return first item in list
function firstItemMatchingVersionClassification (items) {
  let defaultItem = find(items, { classification: 'supported' })
  if (defaultItem) {
    return defaultItem
  }

  defaultItem = find(items, machineImage => {
    return machineImage.classification === undefined
  })
  if (defaultItem) {
    return defaultItem
  }

  return head(items)
}

function filterShortcuts ({ getters }, { shortcuts, targetsFilter }) {
  shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.CONTROL_PLANE && getters.hasControlPlaneTerminalAccess) || target !== TargetEnum.CONTROL_PLANE)
  shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.GARDEN && getters.hasGardenTerminalAccess) || target !== TargetEnum.GARDEN)
  shortcuts = filter(shortcuts, ({ target }) => ((target === TargetEnum.SHOOT && getters.hasShootTerminalAccess) || target !== TargetEnum.SHOOT))
  shortcuts = filter(shortcuts, ({ target }) => includes(targetsFilter, target))
  return shortcuts
}

// getters
const getters = {
  apiServerUrl (state) {
    return get(state.cfg, 'apiServerUrl', window.location.origin)
  },
  cloudProfileList (state) {
    return state.cloudProfiles.all
  },
  seedList (state) {
    return state.seeds.all
  },
  cloudProfileByName (state, getters) {
    return name => getters['cloudProfiles/cloudProfileByName'](name)
  },
  seedByName (state, getters) {
    return name => getters['seeds/seedByName'](name)
  },
  isSeedUnreachableByName (state, getters) {
    return name => {
      const seed = getters.seedByName(name)
      return get(seed, 'metadata.unreachable')
    }
  },
  cloudProfilesByCloudProviderKind (state) {
    return (cloudProviderKind) => {
      const predicate = item => item.metadata.cloudProviderKind === cloudProviderKind
      const filteredCloudProfiles = filter(state.cloudProfiles.all, predicate)
      return sortBy(filteredCloudProfiles, 'metadata.name')
    }
  },
  machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    const machineAndVolumeTypePredicate = unavailableItems => {
      return item => {
        if (item.usable === false) {
          return false
        }
        if (includes(unavailableItems, item.name)) {
          return false
        }
        return true
      }
    }

    return ({ type, cloudProfileName, region, zones }) => {
      if (!cloudProfileName) {
        return []
      }
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (!cloudProfile) {
        return []
      }
      const items = cloudProfile.data[type]
      if (!region || !zones) {
        return items
      }
      const regionObject = find(cloudProfile.data.regions, { name: region })
      let regionZones = get(regionObject, 'zones', [])
      regionZones = filter(regionZones, regionZone => includes(zones, regionZone.name))
      const unavailableItems = flatMap(regionZones, zone => {
        if (type === 'machineTypes') {
          return zone.unavailableMachineTypes
        } else if (type === 'volumeTypes') {
          return zone.unavailableVolumeTypes
        }
      })
      return filter(items, machineAndVolumeTypePredicate(unavailableItems))
    }
  },
  machineTypesByCloudProfileName (state, getters) {
    return ({ cloudProfileName }) => {
      return getters.machineTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName })
    }
  },
  machineTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    return ({ cloudProfileName, region, zones }) => {
      return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({ type: 'machineTypes', cloudProfileName, region, zones })
    }
  },
  volumeTypesByCloudProfileName (state, getters) {
    return ({ cloudProfileName }) => {
      return getters.volumeTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName })
    }
  },
  volumeTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    return ({ cloudProfileName, region, zones }) => {
      return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({ type: 'volumeTypes', cloudProfileName, region, zones })
    }
  },
  machineImagesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const machineImages = get(cloudProfile, 'data.machineImages')

      const mapMachineImages = (machineImage) => {
        const versions = filter(machineImage.versions, ({ version, expirationDate }) => {
          if (!semver.valid(version)) {
            console.error(`Skipped machine image ${machineImage.name} as version ${version} is not a valid semver version`)
            return false
          }
          return true
        })
        versions.sort((a, b) => {
          return semver.rcompare(a.version, b.version)
        })

        return map(versions, ({ version, expirationDate, classification }) => {
          const vendorName = vendorNameFromImageName(machineImage.name)
          const name = machineImage.name

          return {
            key: name + '/' + version,
            name,
            version,
            classification,
            isPreview: classification === 'preview',
            isSupported: classification === 'supported',
            isDeprecated: classification === 'deprecated',
            isExpired: expirationDate && moment().isAfter(expirationDate),
            expirationDate,
            expirationDateString: getDateFormatted(expirationDate),
            vendorName,
            icon: vendorName,
            needsLicense: vendorNeedsLicense(vendorName)
          }
        })
      }

      return flatMap(machineImages, mapMachineImages)
    }
  },
  zonesByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        return map(get(find(cloudProfile.data.regions, { name: region }), 'zones'), 'name')
      }
      return []
    }
  },
  accessRestrictionNoItemsTextForCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName: cloudProfile, region }) => {
      const noItemsText = get(state, 'cfg.accessRestriction.noItemsText', 'No access restriction options available for region ${region}') // eslint-disable-line no-template-curly-in-string

      const compiled = template(noItemsText)
      return compiled({
        region,
        cloudProfile
      })
    }
  },
  accessRestrictionDefinitionsByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      if (!cloudProfileName) {
        return undefined
      }
      if (!region) {
        return undefined
      }

      const labels = getters.labelsByCloudProfileNameAndRegion({ cloudProfileName, region })
      if (isEmpty(labels)) {
        return undefined
      }

      const items = get(state, 'cfg.accessRestriction.items')
      return filter(items, ({ key }) => {
        if (!key) {
          return false
        }
        return labels[key] === 'true'
      })
    }
  },
  accessRestrictionsForShootByCloudProfileNameAndRegion (state, getters) {
    return ({ shootResource, cloudProfileName, region }) => {
      const definitions = getters.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName, region })

      let accessRestrictionsMap = map(definitions, definition => mapAccessRestrictionForInput(definition, shootResource))
      accessRestrictionsMap = compact(accessRestrictionsMap)
      return fromPairs(accessRestrictionsMap)
    }
  },
  selectedAccessRestrictionsForShootByCloudProfileNameAndRegion (state, getters) {
    return ({ shootResource, cloudProfileName, region }) => {
      const definitions = getters.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName, region })
      const accessRestrictions = getters.accessRestrictionsForShootByCloudProfileNameAndRegion({ shootResource, cloudProfileName, region })

      return compact(map(definitions, definition => mapAccessRestrictionForDisplay({ definition, accessRestriction: accessRestrictions[definition.key] })))
    }
  },
  labelsByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        return get(find(cloudProfile.data.regions, { name: region }), 'labels')
      }
      return {}
    }
  },
  defaultMachineImageForCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const machineImages = getters.machineImagesByCloudProfileName(cloudProfileName)
      const defaultMachineImage = firstItemMatchingVersionClassification(machineImages)
      return pick(defaultMachineImage, 'name', 'version')
    }
  },
  shootList (state, getters) {
    return getters['shoots/sortedItems']
  },
  selectedShoot (state, getters) {
    return getters['shoots/selectedItem']
  },
  projectList (state) {
    return state.projects.all
  },
  projectFromProjectList (state, getters) {
    const predicate = project => project.metadata.namespace === state.namespace
    return find(getters.projectList, predicate) || {}
  },
  projectName (state, getters) {
    const project = getters.projectFromProjectList
    return get(project, 'metadata.name')
  },
  projectNamesFromProjectList (state, getters) {
    return map(getters.projectList, 'metadata.name')
  },
  costObjectSettings (state) {
    const costObject = state.cfg.costObject
    if (!costObject) {
      return undefined
    }

    const title = costObject.title || ''
    const description = costObject.description || ''
    const regex = costObject.regex
    const errorMessage = costObject.errorMessage

    return {
      regex,
      title,
      description,
      errorMessage
    }
  },
  memberList (state, getters) {
    return state.members.all
  },
  infrastructureSecretList (state) {
    return state.infrastructureSecrets.all
  },
  getInfrastructureSecretByBindingName (state, getters) {
    return ({ namespace, name }) => {
      return getters['infrastructureSecrets/getInfrastructureSecretByBindingName']({ namespace, name })
    }
  },
  namespaces (state) {
    return map(state.projects.all, 'metadata.namespace')
  },
  defaultNamespace (state, getters) {
    return includes(getters.namespaces, 'garden') ? 'garden' : head(getters.namespaces)
  },
  cloudProviderKindList (state) {
    return uniq(map(state.cloudProfiles.all, 'metadata.cloudProviderKind'))
  },
  sortedCloudProviderKindList (state, getters) {
    return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud', 'metal', 'vsphere'], getters.cloudProviderKindList)
  },
  regionsWithSeedByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (!cloudProfile) {
        return []
      }
      const seedNames = cloudProfile.data.seedNames
      if (!seedNames) {
        return []
      }
      const seeds = getters.seedsByNames(seedNames)
      const uniqueSeedRegions = uniq(map(seeds, 'data.region'))
      const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, isValidRegion(getters, cloudProfileName, cloudProfile.metadata.cloudProviderKind))
      return uniqueSeedRegionsWithZones
    }
  },
  seedsByNames (state, getters) {
    return seedNames => map(seedNames, getters.seedByName)
  },
  regionsWithoutSeedByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        const regionsInCloudProfile = map(cloudProfile.data.regions, 'name')
        const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, isValidRegion(getters, cloudProfileName, cloudProfile.metadata.cloudProviderKind))
        const regionsWithoutSeed = difference(regionsInCloudProfileWithZones, getters.regionsWithSeedByCloudProfileName(cloudProfileName))
        return regionsWithoutSeed
      }
      return []
    }
  },
  minimumVolumeSizeByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const defaultMinimumSize = '20Gi'
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (!cloudProfile) {
        return defaultMinimumSize
      }
      const seedsForCloudProfile = cloudProfile.data.seeds
      const seedsMatchingCloudProfileAndRegion = find(seedsForCloudProfile, { data: { region } })
      return max(map(seedsMatchingCloudProfileAndRegion, 'volume.minimumSize')) || defaultMinimumSize
    }
  },
  floatingPoolNamesByCloudProfileNameAndRegionAndDomain (state, getters) {
    return ({ cloudProfileName, region, secretDomain }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const floatingPools = get(cloudProfile, 'data.providerConfig.constraints.floatingPools')
      let availableFloatingPools = filter(floatingPools, matchesPropertyOrEmpty('region', region))
      availableFloatingPools = filter(availableFloatingPools, matchesPropertyOrEmpty('domain', secretDomain))

      const hasRegionSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.region && !fp.nonConstraining)
      if (hasRegionSpecificFloatingPool) {
        availableFloatingPools = filter(availableFloatingPools, { region })
      }
      const hasDomainSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.domain && !fp.nonConstraining)
      if (hasDomainSpecificFloatingPool) {
        availableFloatingPools = filter(availableFloatingPools, { domain: secretDomain })
      }

      return uniq(map(availableFloatingPools, 'name'))
    }
  },
  loadBalancerProviderNamesByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const loadBalancerProviders = get(cloudProfile, 'data.providerConfig.constraints.loadBalancerProviders')
      let availableLoadBalancerProviders = filter(loadBalancerProviders, matchesPropertyOrEmpty('region', region))
      const hasRegionSpecificLoadBalancerProvider = find(availableLoadBalancerProviders, lb => !!lb.region)
      if (hasRegionSpecificLoadBalancerProvider) {
        availableLoadBalancerProviders = filter(availableLoadBalancerProviders, { region })
      }
      return uniq(map(availableLoadBalancerProviders, 'name'))
    }
  },
  loadBalancerClassNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const loadBalancerClasses = getters.loadBalancerClassesByCloudProfileName(cloudProfileName)
      return uniq(map(loadBalancerClasses, 'name'))
    }
  },
  loadBalancerClassesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.providerConfig.constraints.loadBalancerConfig.classes')
    }
  },
  partitionIDsByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      // Partion IDs equal zones for metal infrastructure
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (get(cloudProfile, 'metadata.cloudProviderKind') !== 'metal') {
        return
      }
      const partitionIDs = getters.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
      return partitionIDs
    }
  },
  firewallSizesByCloudProfileNameAndRegionAndZones (state, getters) {
    return ({ cloudProfileName, region }) => {
      // Firewall Sizes equals to list of image types for this zone
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (get(cloudProfile, 'metadata.cloudProviderKind') !== 'metal') {
        return
      }
      const firewallSizes = getters.machineTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName, region })
      return firewallSizes
    }
  },
  firewallImagesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.providerConfig.firewallImages')
    }
  },
  firewallNetworksByCloudProfileNameAndPartitionId (state, getters) {
    return ({ cloudProfileName, partitionID }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const networks = get(cloudProfile, ['data', 'providerConfig', 'firewallNetworks', partitionID])
      return map(toPairs(networks), ([key, value]) => {
        return {
          key,
          value,
          text: `${key} [${value}]`
        }
      })
    }
  },

  infrastructureSecretsByInfrastructureKind (state) {
    return (infrastructureKind) => {
      return filter(state.infrastructureSecrets.all, ['metadata.cloudProviderKind', infrastructureKind])
    }
  },
  infrastructureSecretsByCloudProfileName (state) {
    return (cloudProfileName) => {
      return filter(state.infrastructureSecrets.all, ['metadata.cloudProfileName', cloudProfileName])
    }
  },
  shootByNamespaceAndName (state, getters) {
    return ({ namespace, name }) => {
      return getters['shoots/itemByNameAndNamespace']({ namespace, name })
    }
  },
  ticketsByNamespaceAndName (state, getters) {
    return ({ namespace, name }) => {
      const projectName = getProjectName({ namespace })
      return getters['tickets/issues']({ projectName, name })
    }
  },
  ticketCommentsByIssueNumber (state, getters) {
    return ({ issueNumber }) => {
      return getters['tickets/comments']({ issueNumber })
    }
  },
  latestUpdatedTicketByNameAndNamespace (state, getters) {
    return ({ namespace, name }) => {
      const projectName = getProjectName({ namespace })
      return getters['tickets/latestUpdated']({ projectName, name })
    }
  },
  ticketsLabels (state, getters) {
    return ({ namespace, name }) => {
      const projectName = getProjectName({ namespace })
      return getters['tickets/labels']({ projectName, name })
    }
  },
  kubernetesVersions (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const allVersions = get(cloudProfile, 'data.kubernetes.versions', [])
      const validVersions = filter(allVersions, ({ expirationDate, version }) => {
        if (!semver.valid(version)) {
          console.error(`Skipped Kubernetes version ${version} as it is not a valid semver version`)
          return false
        }
        return true
      })
      return map(validVersions, version => {
        const classification = version.classification
        return {
          ...version,
          isPreview: classification === 'preview',
          isSupported: classification === 'supported',
          isDeprecated: classification === 'deprecated',
          isExpired: version.expirationDate && moment().isAfter(version.expirationDate),
          expirationDateString: getDateFormatted(version.expirationDate)
        }
      })
    }
  },
  sortedKubernetesVersions (state, getters) {
    return (cloudProfileName) => {
      const kubernetsVersions = cloneDeep(getters.kubernetesVersions(cloudProfileName))
      kubernetsVersions.sort((a, b) => {
        return semver.rcompare(a.version, b.version)
      })
      return kubernetsVersions
    }
  },
  defaultKubernetesVersionForCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const k8sVersions = getters.sortedKubernetesVersions(cloudProfileName)
      return firstItemMatchingVersionClassification(k8sVersions)
    }
  },
  isAdmin (state) {
    return get(state.user, 'isAdmin', false)
  },
  ticketList (state) {
    return state.tickets.all
  },
  username (state) {
    const user = state.user
    return user ? user.email || user.id : ''
  },
  userExpiresAt (state) {
    const user = state.user
    return user ? user.exp * 1000 : 0
  },
  avatarUrl (state, getters) {
    return gravatarUrlGeneric(getters.username)
  },
  displayName (state) {
    const user = state.user
    return user ? user.name || displayName(user.id) : ''
  },
  fullDisplayName (state) {
    const user = state.user
    return user ? user.name || fullDisplayName(user.id) : ''
  },
  alertMessage (state) {
    return get(state, 'alert.message', '')
  },
  alertType (state) {
    return get(state, 'alert.type', 'error')
  },
  alertBannerMessage (state) {
    return get(state, 'alertBanner.message', '')
  },
  alertBannerType (state) {
    return get(state, 'alertBanner.type', 'error')
  },
  currentNamespaces (state, getters) {
    if (state.namespace === '_all') {
      return getters.namespaces
    }
    if (state.namespace) {
      return [state.namespace]
    }
    return []
  },
  isCurrentNamespace (state, getters) {
    return namespace => includes(getters.currentNamespaces, namespace)
  },
  isWebsocketConnectionError (state) {
    return get(state, 'websocketConnectionError') !== null
  },
  websocketConnectAttempt (state) {
    return get(state, 'websocketConnectionError.reconnectAttempt')
  },
  getShootListFilters (state, getters) {
    return getters['shoots/getShootListFilters']
  },
  newShootResource (state, getters) {
    return getters['shoots/newShootResource']
  },
  initialNewShootResource (state, getters) {
    return getters['shoots/initialNewShootResource']
  },
  hasGardenTerminalAccess (state, getters) {
    return getters.isTerminalEnabled && getters.canCreateTerminals
  },
  hasControlPlaneTerminalAccess (state, getters) {
    return getters.isTerminalEnabled && getters.canCreateTerminals && getters.isAdmin
  },
  hasShootTerminalAccess (state, getters) {
    return getters.isTerminalEnabled && getters.canCreateTerminals
  },
  isTerminalEnabled (state, getters) {
    return get(state, 'cfg.features.terminalEnabled', false)
  },
  isTerminalShortcutsFeatureEnabled (state, getters) {
    return !isEmpty(getters.terminalShortcutsByTargetsFilter()) || getters.isProjectTerminalShortcutsEnabled
  },
  isProjectTerminalShortcutsEnabled (state, getters) {
    return get(state, 'cfg.features.projectTerminalShortcutsEnabled', false)
  },
  canCreateTerminals (state) {
    return canI(state.subjectRules, 'create', 'dashboard.gardener.cloud', 'terminals')
  },
  canCreateShoots (state) {
    return canI(state.subjectRules, 'create', 'core.gardener.cloud', 'shoots')
  },
  canPatchShoots (state) {
    return canI(state.subjectRules, 'patch', 'core.gardener.cloud', 'shoots')
  },
  canDeleteShoots (state) {
    return canI(state.subjectRules, 'delete', 'core.gardener.cloud', 'shoots')
  },
  canGetSecrets (state) {
    return canI(state.subjectRules, 'list', '', 'secrets')
  },
  canGetProjectTerminalShortcuts (state, getters) {
    return getters.canGetSecrets
  },
  canUseProjectTerminalShortcuts (state, getters) {
    return getters.isProjectTerminalShortcutsEnabled && getters.canGetProjectTerminalShortcuts && getters.canCreateTerminals
  },
  canCreateProject (state) {
    return canI(state.subjectRules, 'create', 'core.gardener.cloud', 'projects')
  },
  canPatchProject (state, getters) {
    const name = getters.projectName
    return canI(state.subjectRules, 'patch', 'core.gardener.cloud', 'projects', name)
  },
  canManageMembers (state, getters) {
    const name = getters.projectName
    return canI(state.subjectRules, 'manage-members', 'core.gardener.cloud', 'projects', name)
  },
  canManageServiceAccountMembers (state, getters) {
    return getters.canPatchProject || getters.canManageMembers
  },
  canDeleteProject (state, getters) {
    const name = getters.projectName
    return canI(state.subjectRules, 'delete', 'core.gardener.cloud', 'projects', name)
  },
  draggingDragAndDropId (state, getters) {
    return getters['draggable/draggingDragAndDropId']
  },
  focusedElementId (state) {
    return state.focusedElementId
  },
  splitpaneResize (state) {
    return state.splitpaneResize
  },
  terminalShortcutsByTargetsFilter (state, getters) {
    return (targetsFilter = [TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE, TargetEnum.GARDEN]) => {
      let shortcuts = get(state, 'cfg.terminal.shortcuts', [])
      shortcuts = map(shortcuts, shortcut => new Shortcut(shortcut, false))
      shortcuts = uniqBy(shortcuts, 'id')
      return filterShortcuts({ getters }, { shortcuts, targetsFilter })
    }
  },
  projectTerminalShortcutsByTargetsFilter (state, getters) {
    return (targetsFilter = [TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE, TargetEnum.GARDEN]) => {
      if (get(state, 'projectTerminalShortcuts.namespace') !== state.namespace) {
        return
      }
      let shortcuts = get(state, 'projectTerminalShortcuts.items', [])
      shortcuts = map(shortcuts, shortcut => new Shortcut(shortcut, true))
      shortcuts = uniqBy(shortcuts, 'id')
      return filterShortcuts({ getters }, { shortcuts, targetsFilter })
    }
  },
  isKubeconfigEnabled (state) {
    return !!(get(state, 'kubeconfigData.oidc.clientId') && get(state, 'kubeconfigData.oidc.clientSecret'))
  }
}

// actions
const actions = {
  fetchAll ({ dispatch, commit }, resources) {
    const iteratee = (value, key) => dispatch(key, value)
    return Promise
      .all(map(resources, iteratee))
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchCloudProfiles ({ dispatch }) {
    return dispatch('cloudProfiles/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  async fetchSeeds ({ dispatch }) {
    try {
      await dispatch('seeds/getAll')
    } catch (err) {
      dispatch('setError', err)
    }
  },
  fetchProjects ({ dispatch }) {
    return dispatch('projects/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchMembers ({ dispatch, commit }) {
    return dispatch('members/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchInfrastructureSecrets ({ dispatch, commit }) {
    return dispatch('infrastructureSecrets/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  clearShoots ({ dispatch, commit }) {
    return dispatch('shoots/clearAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  clearIssues ({ dispatch, commit }) {
    return dispatch('tickets/clearIssues')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  clearComments ({ dispatch, commit }) {
    return dispatch('tickets/clearComments')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  async subscribeShoot ({ dispatch, getters }, { name, namespace }) {
    await dispatch('shoots/clearAll')
    return new Promise((resolve, reject) => {
      const done = err => {
        unsubscribe()
        clearTimeout(timeoutId)
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
      const handleSubscriptionTimeout = () => {
        done(Object.assign(new Error('Cluster subscription timed out'), {
          code: 504,
          reason: 'Timeout'
        }))
      }
      const handleSubscriptionAcknowledgement = object => {
        if (object.kind === 'Status') {
          let { code, reason, message } = object
          if (code === 404) {
            reason = 'Cluster not found'
            message = 'The cluster you are looking for doesn\'t exist'
          } else if (code === 403) {
            reason = 'Access to cluster denied'
          } else if (code >= 500) {
            reason = 'Oops, something went wrong'
            message = 'An unexpected error occurred. Please try again later'
          }
          done(Object.assign(new Error(message), { code, reason }))
        } else {
          done()
        }
      }
      const unsubscribe = store.subscribeAction(({ type, payload }, state) => {
        if (type === 'subscribeShootAcknowledgement') {
          handleSubscriptionAcknowledgement(payload)
        }
      })
      const timeoutId = setTimeout(handleSubscriptionTimeout, 36 * 1000)
      EmitterWrapper.shootEmitter.subscribeShoot({ name, namespace })
    })
  },
  subscribeShootAcknowledgement ({ commit, state }, object) {
    if (object.kind === 'Shoot') {
      commit('shoots/HANDLE_EVENTS', {
        rootState: state,
        events: [{
          type: 'ADDED',
          object
        }]
      })
      const fetchShootAndShootSeedInfo = async ({ metadata, spec }) => {
        const promises = []
        if (store.getters.canGetSecrets) {
          promises.push(store.dispatch('getShootInfo', metadata))
        }
        const seedName = spec.seedName
        if (store.getters.isAdmin && !store.getters.isSeedUnreachableByName(seedName)) {
          promises.push(store.dispatch('getShootSeedInfo', metadata))
        }
        try {
          await Promise.all(promises)
        } catch (err) {
          console.error('Failed to fetch shoot or shootSeed info:', err.message)
        }
      }
      fetchShootAndShootSeedInfo(object)
    }
  },
  getShootInfo ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/getInfo', { name, namespace })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  getShootSeedInfo ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/getSeedInfo', { name, namespace })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  async subscribeShoots ({ dispatch, commit, state }) {
    try {
      EmitterWrapper.shootsEmitter.subscribeShoots({ namespace: state.namespace, filter: getFilterValue(state) })
    } catch (err) { /* ignore error */ }
  },
  async subscribeComments ({ dispatch, commit }, { name, namespace }) {
    try {
      EmitterWrapper.ticketCommentsEmitter.subscribeComments({ name, namespace })
    } catch (err) { /* ignore error */ }
  },
  async unsubscribeComments ({ dispatch, commit }) {
    try {
      EmitterWrapper.ticketCommentsEmitter.unsubscribe()
    } catch (err) { /* ignore error */ }
  },
  setSelectedShoot ({ dispatch }, metadata) {
    return dispatch('shoots/setSelection', metadata)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListSortParams ({ dispatch }, options) {
    return dispatch('shoots/setListSortParams', options)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListFilters ({ dispatch, commit }, value) {
    return dispatch('shoots/setShootListFilters', value)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListFilter ({ dispatch, commit }, { filter, value }) {
    return dispatch('shoots/setShootListFilter', { filter, value })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListSearchValue ({ dispatch }, searchValue) {
    return dispatch('shoots/setListSearchValue', searchValue)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setNewShootResource ({ dispatch }, data) {
    return dispatch('shoots/setNewShootResource', data)
  },
  resetNewShootResource ({ dispatch }) {
    return dispatch('shoots/resetNewShootResource')
  },
  createProject ({ dispatch, commit }, data) {
    return dispatch('projects/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project created', type: 'success' })
        return res
      })
  },
  patchProject ({ dispatch, commit }, data) {
    return dispatch('projects/patch', data)
  },
  updateProject ({ dispatch, commit }, data) {
    return dispatch('projects/update', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project updated', type: 'success' })
        return res
      })
  },
  deleteProject ({ dispatch, commit }, data) {
    return dispatch('projects/delete', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project deleted', type: 'success' })
        return res
      })
  },
  createInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret created', type: 'success' })
        return res
      })
  },
  updateInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/update', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret updated', type: 'success' })
        return res
      })
  },
  deleteInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/delete', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret deleted', type: 'success' })
        return res
      })
  },
  createShoot ({ dispatch, commit }, data) {
    return dispatch('shoots/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Cluster created', type: 'success' })
        return res
      })
  },
  deleteShoot ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/delete', { name, namespace })
      .then(res => {
        dispatch('setAlert', { message: 'Cluster marked for deletion', type: 'success' })
        return res
      })
  },
  async addMember ({ dispatch, commit }, payload) {
    const result = await dispatch('members/add', payload)
    await dispatch('setAlert', { message: 'Member added', type: 'success' })
    return result
  },
  async updateMember ({ dispatch, commit }, payload) {
    const result = await dispatch('members/update', payload)
    await dispatch('setAlert', { message: 'Member updated', type: 'success' })
    return result
  },
  async deleteMember ({ dispatch, commit }, payload) {
    try {
      const result = await dispatch('members/delete', payload)
      await dispatch('setAlert', { message: 'Member deleted', type: 'success' })
      return result
    } catch (err) {
      await dispatch('setError', { message: `Delete member failed. ${err.message}` })
    }
  },
  setConfiguration ({ commit, getters }, value) {
    commit('SET_CONFIGURATION', value)

    if (get(value, 'alert')) {
      commit('SET_ALERT_BANNER', get(value, 'alert'))
    }

    forEach(value.knownConditions, (conditionValue, conditionKey) => {
      commit('setCondition', { conditionKey, conditionValue })
    })

    return state.cfg
  },
  async setNamespace ({ dispatch, commit }, namespace) {
    commit('SET_NAMESPACE', namespace)
    await dispatch('refreshSubjectRules', namespace)
    return state.namespace
  },
  async refreshSubjectRules ({ commit }, namespace) {
    try {
      const { data: subjectRules } = await getSubjectRules({ namespace })
      commit('SET_SUBJECT_RULES', subjectRules)
    } catch (err) {
      commit('SET_SUBJECT_RULES', undefined)
      throw err
    }
    return state.subjectRules
  },
  async fetchKubeconfigData ({ commit }) {
    const { data } = await getKubeconfigData()
    commit('SET_KUBECONFIG_DATA', data)
  },
  async ensureProjectTerminalShortcutsLoaded ({ commit, dispatch, state }) {
    const { namespace, projectTerminalShortcuts } = state
    if (!projectTerminalShortcuts || projectTerminalShortcuts.namespace !== namespace) {
      try {
        const { data: items } = await listProjectTerminalShortcuts({ namespace })
        commit('SET_PROJECT_TERMINAL_SHORTCUTS', {
          namespace,
          items
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to list project terminal shortcuts:', err.message)
      }
    }
  },
  setOnlyShootsWithIssues ({ commit }, value) {
    commit('SET_ONLYSHOOTSWITHISSUES', value)
    return state.onlyShootsWithIssues
  },
  setUser ({ dispatch, commit }, value) {
    commit('SET_USER', value)
    return state.user
  },
  unsetUser ({ dispatch, commit }) {
    commit('SET_USER', null)
  },
  setSidebar ({ commit }, value) {
    commit('SET_SIDEBAR', value)
    return state.sidebar
  },
  setLoading ({ commit }) {
    commit('SET_LOADING', true)
    return state.loading
  },
  unsetLoading ({ commit }) {
    commit('SET_LOADING', false)
    return state.loading
  },
  setShootsLoading ({ commit }) {
    commit('SET_SHOOTS_LOADING', true)
    return state.shootsLoading
  },
  unsetShootsLoading ({ commit, getters }, namespaces) {
    const currentNamespace = !some(namespaces, namespace => !getters.isCurrentNamespace(namespace))
    if (currentNamespace) {
      commit('SET_SHOOTS_LOADING', false)
    }
    return state.shootsLoading
  },
  setWebsocketConnectionError ({ commit }, { reason, reconnectAttempt }) {
    commit('SET_WEBSOCKETCONNECTIONERROR', { reason, reconnectAttempt })
    return state.websocketConnectionError
  },
  unsetWebsocketConnectionError ({ commit }) {
    commit('SET_WEBSOCKETCONNECTIONERROR', null)
    return state.websocketConnectionError
  },
  setSubscriptionError ({ dispatch, commit }, value) {
    const { kind, code, message } = value
    if (kind === 'shoot') {
      return commit('shoots/SET_SUBSCRIPTION_ERROR', { code, message })
    }
    return dispatch('setError', value)
  },
  setError ({ commit }, value) {
    commit('SET_ALERT', { message: get(value, 'message', ''), type: 'error' })
    return state.alert
  },
  setAlert ({ commit }, value) {
    commit('SET_ALERT', value)
    return state.alert
  },
  setAlertBanner ({ commit }, value) {
    commit('SET_ALERT_BANNER', value)
    return state.alertBanner
  },
  setDraggingDragAndDropId ({ dispatch }, draggingDragAndDropId) {
    return dispatch('draggable/setDraggingDragAndDropId', draggingDragAndDropId)
  },
  setSplitpaneResize ({ commit }, value) { // TODO setSplitpaneResize called too often
    commit('SPLITPANE_RESIZE', value)
    return state.splitpaneResize
  }
}

// mutations
const mutations = {
  SET_CONFIGURATION (state, value) {
    state.cfg = value
  },
  SET_READY (state, value) {
    state.ready = value
  },
  SET_NAMESPACE (state, value) {
    if (value !== state.namespace) {
      state.namespace = value
      // no need to subscribe for shoots here as this is done in the router on demand (as not all routes require the shoots to be loaded)
    }
  },
  SET_SUBJECT_RULES (state, value) {
    state.subjectRules = value
  },
  SET_KUBECONFIG_DATA (state, value) {
    state.kubeconfigData = value
  },
  SET_PROJECT_TERMINAL_SHORTCUTS (state, value) {
    state.projectTerminalShortcuts = value
  },
  SET_ONLYSHOOTSWITHISSUES (state, value) {
    state.onlyShootsWithIssues = value
    // subscribe again for shoots as the filter has changed
    EmitterWrapper.shootsEmitter.subscribeShoots({ namespace: state.namespace, filter: getFilterValue(state) })
  },
  SET_USER (state, value) {
    state.user = value
    if (value) {
      EmitterWrapper.connect()
    } else {
      EmitterWrapper.disconnect()
    }
  },
  SET_SIDEBAR (state, value) {
    state.sidebar = value
  },
  SET_LOADING (state, value) {
    state.loading = value
  },
  SET_SHOOTS_LOADING (state, value) {
    state.shootsLoading = value
  },
  SET_WEBSOCKETCONNECTIONERROR (state, value) {
    if (value) {
      state.websocketConnectionError = merge({}, state.websocketConnectionError, value)
    } else {
      state.websocketConnectionError = null
    }
  },
  SET_ALERT (state, value) {
    state.alert = value
  },
  SET_ALERT_BANNER (state, value) {
    state.alertBanner = value
  },
  setCondition (state, { conditionKey, conditionValue }) {
    Vue.set(state.conditionCache, conditionKey, conditionValue)
  },
  SET_FOCUSED_ELEMENT_ID (state, value) {
    state.focusedElementId = value
  },
  UNSET_FOCUSED_ELEMENT_ID (state, value) {
    if (state.focusedElementId === value) {
      state.focusedElementId = null
    }
  },
  SPLITPANE_RESIZE (state, value) {
    state.splitpaneResize = value
  }
}

const modules = {
  projects,
  members,
  draggable,
  cloudProfiles,
  seeds,
  shoots,
  infrastructureSecrets,
  tickets
}

const store = new Vuex.Store({
  state,
  actions,
  getters,
  mutations,
  modules,
  strict: debug,
  plugins
})

const { shootsEmitter, shootEmitter, ticketIssuesEmitter, ticketCommentsEmitter } = EmitterWrapper

/* Shoots */
function filterNamespacedEvents (namespacedEvents) {
  const concatEventsForNamespace = (accumulator, namespace) => concat(accumulator, namespacedEvents[namespace] || [])
  return reduce(store.getters.currentNamespaces, concatEventsForNamespace, [])
}
shootsEmitter.on('shoots', namespacedEvents => {
  store.commit('shoots/HANDLE_EVENTS', {
    rootState: state,
    events: filterNamespacedEvents(namespacedEvents)
  })
})
shootEmitter.on('shoot', namespacedEvents => {
  store.commit('shoots/HANDLE_EVENTS', {
    rootState: state,
    events: filterNamespacedEvents(namespacedEvents)
  })
})

/* Ticket Issues */
ticketIssuesEmitter.on('issues', events => {
  store.commit('tickets/HANDLE_ISSUE_EVENTS', events)
})

/* Ticket Comments */
ticketCommentsEmitter.on('comments', events => {
  store.commit('tickets/HANDLE_COMMENTS_EVENTS', events)
})

export default store

export {
  state,
  actions,
  getters,
  mutations,
  modules,
  plugins,
  mapAccessRestrictionForInput,
  firstItemMatchingVersionClassification
}
