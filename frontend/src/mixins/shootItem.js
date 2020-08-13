//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import get from 'lodash/get'
import uniq from 'lodash/uniq'
import flatMap from 'lodash/flatMap'
import cloneDeep from 'lodash/cloneDeep'
import find from 'lodash/find'
import { mapGetters } from 'vuex'

import {
  getDateFormatted,
  getCreatedBy,
  isShootStatusHibernated,
  isReconciliationDeactivated,
  getProjectName,
  isTypeDelete
} from '@/utils'

export const shootItem = {
  computed: {
    ...mapGetters([
      'selectedAccessRestrictionsForShootByCloudProfileNameAndRegion'
    ]),
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
      const confirmationDeprecated = get(this.shootAnnotations, ['confirmation.garden.sapcloud.io/deletion'], 'false')
      const confirmation = get(this.shootAnnotations, ['confirmation.gardener.cloud/deletion'], confirmationDeprecated)
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
      return this.shootAnnotations['gardener.cloud/operation']
    },
    shootPurpose () {
      return get(this.shootSpec, 'purpose')
    },
    isTestingCluster () {
      return this.shootPurpose === 'testing'
    },
    shootExpirationTimestamp () {
      return this.shootAnnotations['shoot.gardener.cloud/expiration-timestamp'] || this.shootAnnotations['shoot.garden.sapcloud.io/expirationTimestamp']
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
      return isShootStatusHibernated(get(this.shootItem, 'status'))
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
      return addons
    },
    shootRegion () {
      return this.shootSpec.region
    },
    shootZones () {
      return uniq(flatMap(get(this.shootSpec, 'provider.workers'), 'zones'))
    },
    podsCidr () {
      return get(this.shootSpec, 'networking.pods')
    },
    nodesCidr () {
      return get(this.shootSpec, 'networking.nodes')
    },
    servicesCidr () {
      return get(this.shootSpec, 'networking.services')
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
    canLinkToSeed () {
      return get(this.shootItem, 'info.canLinkToSeed', false)
    },

    isShootLastOperationTypeDelete () {
      return isTypeDelete(this.shootLastOperation)
    },
    shootLastOperation () {
      return get(this.shootItem, 'status.lastOperation', {})
    },
    shootLastErrors () {
      return get(this.shootItem, 'status.lastErrors', [])
    },
    shootConditions () {
      return get(this.shootItem, 'status.conditions', [])
    },
    shootObservedGeneration () {
      return get(this.shootItem, 'status.observedGeneration')
    },
    shootTechnicalId () {
      return get(this.shootItem, 'status.technicalID')
    },
    shootSeedName () {
      return get(this.shootSpec, 'seedName')
    },
    shootStatusSeedName () {
      return get(this.shootItem, 'status.seed')
    },
    shootSelectedAccessRestrictions () {
      return this.selectedAccessRestrictionsForShootByCloudProfileNameAndRegion({ shootResource: this.shootItem, cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
    },
    isControlPlaneMigrating () {
      return this.shootStatusSeedName && this.shootSeedName && this.shootStatusSeedName !== this.shootSeedName
    },
    hibernationPossibleConstraint () {
      const constraints = get(this.shootItem, 'status.constraints')
      return find(constraints, ['type', 'HibernationPossible'])
    },
    isHibernationPossible () {
      const status = get(this.hibernationPossibleConstraint, 'status', 'True')
      return status !== 'False'
    },
    hibernationPossibleMessage () {
      return get(this.hibernationPossibleConstraint, 'message', 'Hibernation currently not possible')
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
