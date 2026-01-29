//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'
import { useBrowserLocation } from '@vueuse/core'

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'

import { hash } from '@/utils/crypto'

import map from 'lodash/map'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import camelCase from 'lodash/camelCase'
import find from 'lodash/find'
import uniq from 'lodash/uniq'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'

const logger = useLogger()

const wellKnownConditions = {
  APIServerAvailable: {
    name: 'API Server',
    shortName: 'API',
    description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.',
    sortOrder: '0',
  },
  ControlPlaneHealthy: {
    name: 'Control Plane',
    shortName: 'CP',
    description: 'Indicates whether all control plane components are up and running.',
    showAdminOnly: true,
    sortOrder: '1',
  },
  SystemComponentsHealthy: {
    name: 'System Components',
    shortName: 'SC',
    description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '2',
  },
  EveryNodeReady: {
    name: 'Nodes',
    shortName: 'N',
    description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.',
    sortOrder: '3',
  },
  ObservabilityComponentsHealthy: {
    name: 'Observability Components',
    shortName: 'OC',
    description: 'Indicates whether all observability components like Prometheus, Vali, Plutono, etc. are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '4',
  },
  MaintenancePreconditionsSatisfied: {
    name: 'Maintenance Preconditions Satisfied',
    shortName: 'M',
    description: 'Indicates whether Gardener is able to perform required actions during maintenance. If you do not resolve this issue your cluster will eventually turn into an error state.',
    sortOrder: '5',
  },
  HibernationPossible: {
    name: 'Hibernation Preconditions Satisfied',
    shortName: 'H',
    description: 'Indicates whether Gardener is able to hibernate this cluster. If you do not resolve this issue your hibernation schedule may not have any effect.',
    sortOrder: '6',
  },
  BackupBucketsReady: {
    name: 'Seed Backup Buckets',
    shortName: 'BB',
    description: 'Indicates that associated BackupBuckets are ready.',
    sortOrder: '7',
  },
  ExtensionsReady: {
    name: 'Seed Extensions',
    shortName: 'E',
    description: 'Indicates that the extensions are ready.',
    sortOrder: '8',
  },
  GardenletReady: {
    name: 'Seed Gardenlet',
    shortName: 'G',
    description: 'Indicates that the Gardenlet is ready.',
    sortOrder: '9',
  },
  SeedSystemComponentsHealthy: {
    name: 'Seed System Components',
    shortName: 'SSC',
    description: 'Indicates the system components health',
    sortOrder: '10',
  },
  CRDsWithProblematicConversionWebhooks: {
    name: 'CRDs with Problematic Conversion Webhooks',
    shortName: 'CRD',
    description: 'Indicates that there is at least one CustomResourceDefinition in the cluster which has multiple stored versions and a conversion webhook configured. This could break the reconciliation flow of a Shoot cluster in some cases.',
    sortOrder: '11',
  },
  CACertificateValiditiesAcceptable: {
    name: 'CA Certificate Validities',
    shortName: 'CA',
    description: 'Indicates that there is at least one CA certificate which expires in less than 1 year. A credentials rotation operation should be considered.',
    sortOrder: '12',
  },
  DualStackNodesMigrationReady: {
    name: 'Dual Stack Nodes Migration Ready',
    shortName: 'DSNM',
    description: 'Indicates that the nodes of a shoot are ready for dual-stack migration of the cluster. If this is in error state, the nodes need to be rolled before the migration can continue. This error is expected at the beginning of the migration process and does not require immediate user action.',
    sortOrder: '13',
  },
}

export function getCondition (type) {
  if (type in wellKnownConditions) {
    return get(wellKnownConditions, [type])
  }

  let name = ''
  let shortName = ''
  const words = type
    .replace(/(Available|Healthy|Ready|Availability)$/, '')
    // Cannot use lookbehind regex as not supported by all browsers (e.g. Safari)
    // therefore need to do it in two steps
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split before new words
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')// split after uppercase only words
    .split(' ')

  for (const word of words) {
    if (name) {
      name += ' '
    }
    name += word
    shortName += word[0]
  }
  return {
    name,
    shortName,
    sortOrder: shortName,
  }
}

export const useConfigStore = defineStore('config', () => {
  const api = useApi()
  const browserLocation = useBrowserLocation()

  const state = ref(null)

  const isInitial = computed(() => {
    return state.value === null
  })

  const alert = computed(() => {
    return state.value?.alert
  })

  const avatarSource = computed(() => {
    return state.value?.avatarSource
  })

  const accessRestriction = computed(() => {
    return state.value?.accessRestriction
  })

  const sla = computed(() => {
    return state.value?.sla ?? {}
  })

  const costObject = computed(() => {
    return state.value?.costObject
  })

  const features = computed(() => {
    return state.value?.features
  })

  const experimental = computed(() => {
    return state.value?.experimental
  })

  const grantTypes = computed(() => {
    return state.value?.grantTypes ?? ['auto', 'authcode', 'device-code']
  })

  const knownConditions = computed(() => {
    return state.value?.knownConditions
  })

  const allKnownConditions = computed(() => {
    return {
      ...wellKnownConditions,
      ...knownConditions.value,
    }
  })

  const resourceQuotaHelp = computed(() => {
    return state.value?.resourceQuotaHelp
  })

  const controlPlaneHighAvailabilityHelp = computed(() => {
    return state.value?.controlPlaneHighAvailabilityHelp
  })

  const defaultHibernationSchedule = computed(() => {
    return state.value?.defaultHibernationSchedule
  })

  const themes = computed(() => {
    return state.value?.themes
  })

  const branding = computed(() => {
    const branding = {
      productLogoUrl: '/static/assets/logo.svg',
      productName: 'Gardener',
      productTitleSuperscript: appVersion.value,
      productSlogan: 'Universal Kubernetes at Scale',
      ...state.value?.branding,
    }
    if (branding.productTitle === undefined) {
      branding.productTitle = branding.productName
    }
    return branding
  })

  const configInfraVendors = computed(() => {
    const vendors = branding.value.infraVendors
    if (vendors && Array.isArray(vendors)) {
      return vendors
    }
    return []
  })

  const configDNSVendors = computed(() => {
    const vendors = branding.value.dnsVendors
    if (vendors && Array.isArray(vendors)) {
      return vendors
    }
    return []
  })

  const configMachineImageVendors = computed(() => {
    const vendors = branding.value.machineImageVendors
    if (vendors && Array.isArray(vendors)) {
      return vendors
    }
    return []
  })

  const configVendors = computed(() => ({
    infra: configInfraVendors.value,
    dns: configDNSVendors.value,
    machineImage: configMachineImageVendors.value,
  }))

  const terminal = computed(() => {
    return state.value?.terminal
  })

  const terminalShortcuts = computed(() => {
    return terminal.value?.shortcuts
  })

  const ticket = computed(() => {
    return state.value?.ticket
  })

  const vendorHints = computed(() => {
    return state.value?.vendorHints ?? []
  })

  const helpMenuItems = computed(() => {
    return state.value?.helpMenuItems ?? []
  })

  const externalTools = computed(() => {
    return state.value?.externalTools ?? []
  })

  const defaultNodesCIDR = computed(() => {
    return state.value?.defaultNodesCIDR ?? '10.250.0.0/16'
  })

  const shootAdminKubeconfig = computed(() => {
    return state.value?.shootAdminKubeconfig
  })

  const apiServerUrl = computed(() => {
    return state.value?.apiServerUrl ?? browserLocation.value.origin
  })

  const clusterIdentity = computed(() => {
    return state.value?.clusterIdentity
  })

  const seedCandidateDeterminationStrategy = computed(() => {
    return state.value?.seedCandidateDeterminationStrategy
  })

  const serviceAccountDefaultTokenExpiration = computed(() => {
    return state.value?.serviceAccountDefaultTokenExpiration ?? 0
  })

  const isTerminalEnabled = computed(() => {
    return features.value?.terminalEnabled === true
  })

  const isProjectTerminalShortcutsEnabled = computed(() => {
    return features.value?.projectTerminalShortcutsEnabled === true
  })

  const isShootForceDeletionEnabled = computed(() => {
    return features.value?.shootForceDeletionEnabled === true
  })

  const isOidcObservabilityUrlsEnabled = computed(() => {
    return features.value?.oidcObservabilityUrlsEnabled === true
  })

  const throttleDelayPerCluster = computed(() => {
    return experimental.value?.throttleDelayPerCluster ?? 10
  })

  const alertBannerMessage = computed(() => {
    return alert.value?.message
  })

  const alertBannerType = computed(() => {
    return alert.value?.type ?? 'error'
  })

  const alertBannerIdentifier = computed(() => {
    if (!alertBannerMessage.value) {
      return
    }
    let identifier = alert.value?.identifier
    if (identifier) {
      identifier = camelCase(identifier)
    } else {
      identifier = hash(alertBannerMessage.value)
    }
    // we prefix the identifier coming from the configuration so that they do not clash with our internal identifiers (e.g. for the shoot editor warning)
    return `cfg.${identifier}`
  })

  const costObjectsSettings = computed(() => {
    const costObjects = state.value?.costObjects
    if (!costObjects) {
      return undefined
    }

    return map(costObjects, costObject => {
      const type = costObject.type || ''
      const title = costObject.title || ''
      const description = costObject.description || ''
      const regex = costObject.regex
      const errorMessage = costObject.errorMessage

      return {
        type,
        regex,
        title,
        description,
        errorMessage,
      }
    })
  })

  const appVersion = computed(() => {
    return state.value?.appVersion ?? import.meta.env.VITE_APP_VERSION
  })

  const resourceQuotaHelpText = computed(() => {
    return resourceQuotaHelp.value?.text
  })

  const controlPlaneHighAvailabilityHelpText = computed(() => {
    return controlPlaneHighAvailabilityHelp.value?.text
  })

  const unreachableSeeds = computed(() => {
    return state.value?.unreachableSeeds
  })

  async function fetchConfig () {
    const response = await api.getConfiguration()
    setConfiguration({
      themes: {},
      ...response.data,
    })
  }

  function setConfiguration (value) {
    state.value = value
  }

  async function $reset () {
    state.value = null
  }

  function purposeRequiresHibernationSchedule (purpose) {
    if (defaultHibernationSchedule.value) {
      if (!purpose) {
        return true
      }
      return !!get(defaultHibernationSchedule.value, [purpose], false)
    }
    return false
  }

  function isShootHasNoHibernationScheduleWarning (shoot) {
    const purpose = get(shoot, ['spec', 'purpose'])
    const annotations = get(shoot, ['metadata', 'annotations'], {})
    if (purposeRequiresHibernationSchedule(purpose)) {
      const hasNoScheduleFlag = !!annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule']
      if (!hasNoScheduleFlag && isEmpty(get(shoot, ['spec', 'hibernation', 'schedules']))) {
        return true
      }
    }
    return false
  }

  function conditionForType (type) {
    return get(allKnownConditions.value, [type], getCondition(type))
  }

  const knownInfraVendors = [
    {
      name: 'aws',
      displayName: 'AWS',
      weight: 100,
      icon: 'aws.svg',
    },
    {
      name: 'azure',
      displayName: 'Azure',
      weight: 200,
      icon: 'azure.svg',
    },
    {
      name: 'gcp',
      displayName: 'Google Cloud',
      weight: 300,
      icon: 'gcp.svg',
    },
    {
      name: 'openstack',
      displayName: 'OpenStack',
      weight: 400,
      icon: 'openstack.svg',
    },
    {
      name: 'alicloud',
      displayName: 'Alibaba Cloud',
      weight: 500,
      icon: 'alicloud.svg',
    },
    {
      name: 'metal',
      displayName: 'Metal',
      weight: 600,
      icon: 'metal.svg',
    },
    {
      name: 'vsphere',
      displayName: 'vSphere',
      weight: 700,
      icon: 'vsphere.svg',
    },
    {
      name: 'hcloud',
      displayName: 'Hetzner Cloud',
      weight: 800,
      icon: 'hcloud.svg',
    },
    {
      name: 'onMetal',
      displayName: 'OnMetal',
      weight: 900,
      icon: 'onmetal.svg',
    },
    {
      name: 'ironcore',
      displayName: 'IronCore',
      weight: 1000,
      icon: 'ironcore.svg',
    },
    {
      name: 'stackit',
      displayName: 'stackit',
      weight: 1100,
      icon: 'stackit.svg',
    },
    {
      name: 'local',
      displayName: 'Local',
      weight: 10100,
    },
  ]

  const knownDNSVendors = [
    {
      name: 'aws-route53',
      displayName: 'Amazon Route53',
      weight: 100,
      icon: 'aws-route53.svg',
    },
    {
      name: 'azure-dns',
      displayName: 'Azure DNS',
      weight: 200,
      icon: 'azure-dns.svg',
    },
    {
      name: 'azure-private-dns',
      displayName: 'Azure Private DNS',
      weight: 300,
      icon: 'azure-dns.svg',
    },
    {
      name: 'google-clouddns',
      displayName: 'Google Cloud DNS',
      weight: 400,
      icon: 'google-clouddns.svg',
    },
    {
      name: 'openstack-designate',
      displayName: 'OpenStack Designate',
      weight: 500,
      icon: 'openstack.svg',
    },
    {
      name: 'alicloud-dns',
      displayName: 'Alicloud DNS',
      weight: 600,
      icon: 'alicloud-dns.png',
    },

    // other dns providers
    {
      name: 'cloudflare-dns',
      displayName: 'Cloudflare DNS',
      weight: 10100,
      icon: 'cloudflare-dns.svg',
    },
    {
      name: 'infoblox-dns',
      displayName: 'Infoblox',
      weight: 10200,
      icon: 'infoblox-dns.svg',
    },
    {
      name: 'netlify-dns',
      displayName: 'Netlify DNS',
      weight: 10300,
      icon: 'netlify-dns.svg',
    },
    {
      name: 'powerdns',
      displayName: 'PowerDNS',
      weight: 10400,
      icon: 'powerdns.svg',
    },
    {
      name: 'rfc2136',
      displayName: 'Dynamic DNS (RFC2136)',
      weight: 10500,
      icon: 'rfc2136.svg',
    },
  ]

  const knownMachineImageVendors = [
    // os
    {
      name: 'gardenlinux',
      displayName: 'Garden Linux',
      weight: 100,
      icon: 'gardenlinux.svg',
    },
    {
      name: 'ubuntu',
      displayName: 'Ubuntu',
      weight: 200,
      icon: 'ubuntu.svg',
    },
    {
      name: 'coreos',
      displayName: 'CoreOS',
      weight: 300,
      icon: 'coreos.svg',
    },
    {
      name: 'flatcar',
      displayName: 'Flatcar',
      weight: 400,
      icon: 'flatcar.svg',
    },
    {
      name: 'suse-jeos',
      displayName: 'SUSE Linux Enterprise Server (JeOS)',
      weight: 500,
      icon: 'suse.svg',
    },
    {
      name: 'suse-chost',
      displayName: 'SUSE Container Host configuration (Chost)',
      weight: 600,
      icon: 'suse.svg',
    },
    {
      name: 'memoryone-chost',
      displayName: 'MemoryOne Container Host configuration (Chost)',
      weight: 700,
      icon: 'suse.svg',
    },
  ]

  const knownVendors = {
    infra: knownInfraVendors,
    dns: knownDNSVendors,
    machineImage: knownMachineImageVendors,
  }

  const vendorKey = (type, name) => `${type}::${name}`

  const vendorTypes = computed(() => {
    return new Set([
      ...Object.keys(knownVendors),
      ...Object.keys(configVendors.value),
    ])
  })

  const vendorDetailsMap = computed(() => {
    const detailsMap = new Map()

    for (const type of vendorTypes.value) {
      const knownArr = get(knownVendors, [type], [])
      const confArr = get(configVendors.value, [type], [])

      const names = new Set([
        ...map(knownArr, 'name'),
        ...map(confArr, 'name'),
      ])

      for (const name of names) {
        const knownVendor = find(knownArr, ['name', name])
        const configuredVendor = find(confArr, ['name', name])

        detailsMap.set(vendorKey(type, name), {
          type,
          name,
          weight: Number.MAX_SAFE_INTEGER,
          ...knownVendor,
          ...configuredVendor,
        })
      }
    }

    return detailsMap
  })

  function vendorDetails (name) {
    const matches = []
    for (const t of vendorTypes.value) {
      const vendor = vendorDetailsMap.value.get(vendorKey(t, name))
      if (vendor) {
        matches.push(vendor)
      }
    }

    if (matches.length === 1) {
      return head(matches)
    }

    if (matches.length === 0) {
      logger.warn(`VendorDetails: No vendor found for name='${name}'`)
    }

    if (matches.length > 1) {
      logger.warn(`VendorDetails: Multiple vendors found for name='${name}'`)
    }

    return {
      name,
      weight: Number.MAX_SAFE_INTEGER,
    }
  }

  function vendorDisplayName (name) {
    return get(vendorDetails(name), ['displayName'], name)
  }

  const dnsProviderTypesList = computed(() => {
    return uniq([
      ...map(knownDNSVendors, 'name'),
      ...map(configDNSVendors.value, 'name'),
    ])
  })

  const sortedDnsProviderTypeList = computed(() => {
    const dnsProviderVendors = map(dnsProviderTypesList.value, vendorDetails)
    const sortedVisibleDnsVendors = sortBy(dnsProviderVendors, 'weight')
    return map(sortedVisibleDnsVendors, 'name')
  })

  return {
    isInitial,
    appVersion,
    alert,
    avatarSource,
    accessRestriction,
    sla,
    costObject,
    features,
    grantTypes,
    knownConditions,
    resourceQuotaHelp,
    resourceQuotaHelpText,
    controlPlaneHighAvailabilityHelp,
    controlPlaneHighAvailabilityHelpText,
    defaultHibernationSchedule,
    themes,
    branding,
    terminal,
    terminalShortcuts,
    ticket,
    vendorHints,
    helpMenuItems,
    externalTools,
    defaultNodesCIDR,
    shootAdminKubeconfig,
    apiServerUrl,
    clusterIdentity,
    seedCandidateDeterminationStrategy,
    serviceAccountDefaultTokenExpiration,
    isTerminalEnabled,
    isProjectTerminalShortcutsEnabled,
    isShootForceDeletionEnabled,
    isOidcObservabilityUrlsEnabled,
    throttleDelayPerCluster,
    alertBannerMessage,
    alertBannerType,
    alertBannerIdentifier,
    costObjectsSettings,
    sortedDnsProviderTypeList,
    unreachableSeeds,
    purposeRequiresHibernationSchedule,
    isShootHasNoHibernationScheduleWarning,
    fetchConfig,
    setConfiguration,
    conditionForType,
    vendorDetails,
    // vendor: vendorDetails,
    vendorDisplayName,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConfigStore, import.meta.hot))
}
