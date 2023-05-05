//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import map from 'lodash/map'
import filter from 'lodash/filter'
import get from 'lodash/get'
import includes from 'lodash/includes'
import some from 'lodash/some'
import compact from 'lodash/compact'
import find from 'lodash/find'
import head from 'lodash/head'
import lowerCase from 'lodash/lowerCase'
import fromPairs from 'lodash/fromPairs'
import isEqual from 'lodash/isEqual'

import {
  getDateFormatted,
  TargetEnum,
} from '@/utils'
import moment from '@/utils/moment'
import { hash } from '@/utils/crypto'

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

export function vendorNameFromImageName (imageName) {
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
  } else if (lowerCaseName.includes('flatcar')) {
    return 'flatcar'
  } else if (lowerCaseName.includes('memoryone') || lowerCaseName.includes('vsmp')) {
    return 'memoryone'
  } else if (lowerCaseName.includes('aws-route53')) {
    return 'aws-route53'
  } else if (lowerCaseName.includes('azure-dns')) {
    return 'azure-dns'
  } else if (lowerCaseName.includes('azure-private-dns')) {
    return 'azure-private-dns'
  } else if (lowerCaseName.includes('google-clouddns')) {
    return 'google-clouddns'
  } else if (lowerCaseName.includes('openstack-designate')) {
    return 'openstack-designate'
  } else if (lowerCaseName.includes('alicloud-dns')) {
    return 'alicloud-dns'
  } else if (lowerCaseName.includes('cloudflare-dns')) {
    return 'cloudflare-dns'
  } else if (lowerCaseName.includes('infoblox-dns')) {
    return 'infoblox-dns'
  } else if (lowerCaseName.includes('netlify-dns')) {
    return 'netlify-dns'
  }
  return undefined
}

export function findVendorHint (vendorHints, vendorName) {
  return find(vendorHints, hint => includes(hint.matchNames, vendorName))
}

export function matchesPropertyOrEmpty (path, srcValue) {
  return object => {
    const objValue = get(object, path)
    if (!objValue) {
      return true
    }
    return isEqual(objValue, srcValue)
  }
}

export function isValidRegion (getters, cloudProfileName, cloudProviderKind) {
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

export function mapOptionForInput (optionValue, shootResource) {
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
    value,
  }
  return [key, option]
}

export function mapAccessRestrictionForInput (accessRestrictionDefinition, shootResource) {
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
    options,
  }
  return [key, accessRestriction]
}

function mapOptionForDisplay ({ optionDefinition, option: { value } }) {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description,
    },
  } = optionDefinition

  const optionVisible = visibleIf === value
  if (!optionVisible) {
    return undefined // skip
  }

  return {
    key,
    title,
    description,
  }
}

export function mapAccessRestrictionForDisplay ({ definition, accessRestriction: { value, options } }) {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description,
    },
    options: optionDefinitions,
  } = definition

  const accessRestrictionVisible = visibleIf === value
  if (!accessRestrictionVisible) {
    return undefined // skip
  }

  const optionsList = compact(map(optionDefinitions, optionDefinition => mapOptionForDisplay({ optionDefinition, option: options[optionDefinition.key] })))

  return {
    key,
    title,
    description,
    options: optionsList,
  }
}

// Return first item with classification supported, if no item has classification supported
// return first item with classifiction undefined, if no item matches these requirements,
// return first item in list
export function firstItemMatchingVersionClassification (items) {
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

export function filterShortcuts (authzStore, { shortcuts, targetsFilter }) {
  shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.CONTROL_PLANE && authzStore.hasControlPlaneTerminalAccess) || target !== TargetEnum.CONTROL_PLANE)
  shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.GARDEN && authzStore.hasGardenTerminalAccess) || target !== TargetEnum.GARDEN)
  shortcuts = filter(shortcuts, ({ target }) => ((target === TargetEnum.SHOOT && authzStore.hasShootTerminalAccess) || target !== TargetEnum.SHOOT))
  shortcuts = filter(shortcuts, ({ target }) => includes(targetsFilter, target))
  return shortcuts
}

export function decorateClassificationObject (obj) {
  const classification = obj.classification ?? 'supported'
  const isExpired = obj.expirationDate && moment().isAfter(obj.expirationDate)
  return {
    ...obj,
    isPreview: classification === 'preview',
    isSupported: classification === 'supported' && !isExpired,
    isDeprecated: classification === 'deprecated',
    isExpired,
    expirationDateString: getDateFormatted(obj.expirationDate),
  }
}
