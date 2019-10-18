import get from 'lodash/get'
import uniq from 'lodash/uniq'
import flatMap from 'lodash/flatMap'

import {
  getDateFormatted,
  getCreatedBy,
  isHibernated,
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
    isShootHibernated () {
      return isHibernated(this.shootSpec)
    },
    shootSecret () {
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
      return get(this.shootSpec, 'addons', {})
    },
    shootRegion () {
      return this.shootSpec.region
    },
    shootZones () {
      return uniq(flatMap(get(this.shootSpec, 'provider.workers', []), 'zones'))
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
    shootSeed () {
      return get(this.shootItem, 'status.seed')
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
