import get from 'lodash/get'

import {
  isShootMarkedForDeletion,
  getDateFormatted,
  getCreatedBy,
  isHibernated,
  isReconciliationDeactivated,
  getCloudProviderKind,
  getProjectName
} from '@/utils'

export const shootGetters = {
  computed: {
    shootMetadata () {
      return get(this.shootItem, 'metadata', {})
    },
    shootName () {
      return get(this.shootMetadata, 'name')
    },
    shootNamespace () {
      return get(this.shootMetadata, 'namespace')
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(this.shootMetadata)
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
    isShootHibernated () {
      return isHibernated(get(this.shootItem, 'spec'))
    },
    shootGardenOperation () {
      return get(this.shootItem, ['metadata', 'annotations', 'shoot.garden.sapcloud.io/operation'])
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
    shootAnnotations () {
      return get(this.shootItem, 'metadata.annotations', {})
    },
    shootSpec () {
      return get(this.shootItem, 'spec', {})
    },
    isShootReconciliationDeactivated () {
      return isReconciliationDeactivated(this.shootMetadata)
    },
    shootInfo () {
      return get(this.shootItem, 'info', {})
    },
    shootSecret () {
      return get(this.shootItem, 'spec.cloud.secretBindingRef.name')
    },
    shootGenerationValue () {
      return get(this.shootItem, 'metadata.generation')
    },
    shootDeletionTimestamp () {
      return get(this.shootItem, 'metadata.deletionTimestamp')
    },
    shootK8sVersion () {
      return get(this.shootItem, 'spec.kubernetes.version')
    },
    shootPurpose () {
      return this.shootAnnotations['garden.sapcloud.io/purpose']
    },
    shootCloudProfileName () {
      return get(this.shootItem, 'spec.cloud.profile')
    },
    shootCloudProviderKind () {
      return getCloudProviderKind(get(this.shootItem, 'spec.cloud'))
    },
    shootWorkerGroups () {
      const kind = this.shootCloudProviderKind
      return get(this.shootItem, `spec.cloud.${kind}.workers`, [])
    },
    shootAddons () {
      return get(this.shootItem, 'spec.addons', {})
    },
    shootRegion () {
      return get(this.shootItem, 'spec.cloud.region')
    },
    shootZones () {
      return get(this.shootItem, ['spec', 'cloud', this.shootCloudProviderKind, 'zones'], [])
    },
    seedShootIngressDomain () {
      return this.shootInfo.seedShootIngressDomain || ''
    },
    shootCidr () {
      return get(this.shootItem, ['spec', 'cloud', this.shootCloudProviderKind, 'networks', 'nodes'])
    },
    shootTechnicalId () {
      return get(this.shootItem, `status.technicalID`)
    },
    shootSeed () {
      return get(this.shootItem, 'spec.cloud.seed')
    },
    shootDomain () {
      return get(this.shootItem, 'spec.dns.domain')
    },
    shootHibernationSchedules () {
      return get(this.shootItem, 'spec.hibernation.schedules', [])
    },
    shootMaintenance () {
      return get(this.shootItem, 'spec.maintenance', [])
    },
    shootProjectName () {
      return getProjectName(get(this.shootItem, 'metadata'))
    },
    shootExpirationTimestamp () {
      return get(this.shootAnnotations, 'shoot.garden.sapcloud.io/expirationTimestamp')
    }
  }
}
