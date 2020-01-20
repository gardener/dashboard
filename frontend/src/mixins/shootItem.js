import get from 'lodash/get'
import uniq from 'lodash/uniq'
import flatMap from 'lodash/flatMap'
import cloneDeep from 'lodash/cloneDeep'

import {
  getDateFormatted,
  getCreatedBy,
  isShootStatusHibernated,
  isReconciliationDeactivated,
  getProjectName
} from '@/utils'

export const shootItem = {
  computed: {
    shootMetadata () {
      return get(this.shootItem, 'metadata', {})
    },
    shootName () {
      return this.shootMetadata.name
    },
    shootNamespace () {
      return this.shootMetadata.namespace
    },
    isShootMarkedForDeletion () {
      const confirmation = get(this.shootAnnotations, ['confirmation.garden.sapcloud.io/deletion'], 'false')
      const deletionTimestamp = this.shootDeletionTimestamp

      return !!deletionTimestamp && confirmation === 'true'
    },
    shootCreatedBy () {
      return getCreatedBy(this.shootMetadata)
    },
    shootCreatedAt () {
      return getDateFormatted(this.shootMetadata.creationTimestamp)
    },
    shootCreationTimestamp () {
      return this.shootMetadata.creationTimestamp
    },
    isShootReconciliationDeactivated () {
      return isReconciliationDeactivated(this.shootMetadata)
    },
    shootGenerationValue () {
      return this.shootMetadata.generation
    },
    shootDeletionTimestamp () {
      return this.shootMetadata.deletionTimestamp
    },
    shootProjectName () {
      return getProjectName(this.shootMetadata)
    },

    shootAnnotations () {
      return get(this.shootMetadata, 'annotations', {})
    },
    shootGardenOperation () {
      return this.shootAnnotations['shoot.garden.sapcloud.io/operation']
    },
    shootPurpose () {
      return this.shootAnnotations['garden.sapcloud.io/purpose']
    },
    shootExpirationTimestamp () {
      return this.shootAnnotations['shoot.garden.sapcloud.io/expirationTimestamp']
    },
    isShootActionsDisabledForPurpose () {
      return this.shootPurpose === 'infrastructure'
    },
    shootSpec () {
      return get(this.shootItem, 'spec', {})
    },
    isShootSettingHibernated () {
      return get(this.shootSpec, 'hibernation.enabled', false)
    },
    isShootStatusHibernated () {
      return isShootStatusHibernated(this.shootItem.status)
    },
    isShootStatusHibernationProgressing () {
      return this.isShootSettingHibernated !== this.isShootStatusHibernated
    },
    shootSecretBindingName () {
      return this.shootSpec.secretBindingName
    },
    shootK8sVersion () {
      return get(this.shootSpec, 'kubernetes.version')
    },
    shootCloudProfileName () {
      return this.shootSpec.cloudProfileName
    },
    shootCloudProviderKind () {
      return get(this.shootSpec, 'provider.type')
    },
    shootWorkerGroups () {
      return get(this.shootSpec, 'provider.workers', [])
    },
    shootAddons () {
      const addons = cloneDeep(get(this.shootSpec, 'addons', {}))
      const kymaAddonEnabled = !!get(this.shootAnnotations, '["experimental.addons.shoot.gardener.cloud/kyma"]')
      if (kymaAddonEnabled) {
        addons['kyma'] = { enabled: true }
      }
      return addons
    },
    shootRegion () {
      return this.shootSpec.region
    },
    shootZones () {
      return uniq(flatMap(get(this.shootSpec, 'provider.workers'), 'zones'))
    },
    shootCidr () {
      return get(this.shootSpec, 'provider.infrastructureConfig.networks.vpc.cidr')
    },
    shootDomain () {
      return get(this.shootSpec, 'dns.domain')
    },
    shootHibernationSchedules () {
      return get(this.shootSpec, 'hibernation.schedules', [])
    },
    shootMaintenance () {
      return get(this.shootSpec, 'maintenance', [])
    },

    shootInfo () {
      return get(this.shootItem, 'info', {})
    },
    seedShootIngressDomain () {
      return this.shootInfo.seedShootIngressDomain || ''
    },

    shootLastOperation () {
      return get(this.shootItem, 'status.lastOperation', {})
    },
    shootLastError () {
      return get(this.shootItem, 'status.lastError', {})
    },
    shootConditions () {
      return get(this.shootItem, 'status.conditions', [])
    },
    shootObservedGeneration () {
      return get(this.shootItem, 'status.observedGeneration', [])
    },
    shootTechnicalId () {
      return get(this.shootItem, `status.technicalID`)
    },
    shootSeedName () {
      return get(this.shootSpec, 'seedName')
    },
    shootStatusSeedName () {
      return get(this.shootItem, 'status.seed')
    },
    isControlPlaneMigrating () {
      return this.shootStatusSeedName && this.shootSeedName && this.shootStatusSeedName !== this.shootSeedName
    }
  },
  methods: {
    shootActionToolTip (tooltip) {
      if (!this.isShootActionsDisabledForPurpose) {
        return tooltip
      }
      return 'Actions disabled for cluster purpose infrastructure'
    }
  }
}
