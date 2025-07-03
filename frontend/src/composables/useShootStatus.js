//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  isStatusHibernated,
  isTypeDelete,
} from '@/utils'

import get from 'lodash/get'
import find from 'lodash/find'
import filter from 'lodash/filter'

export const useShootStatus = shootItem => {
  const shootStatus = computed(() => {
    return get(shootItem.value, ['status'], {})
  })

  const isShootStatusHibernated = computed(() => {
    return isStatusHibernated(shootStatus.value)
  })

  const isShootLastOperationTypeDelete = computed(() => {
    return isTypeDelete(shootLastOperation.value)
  })

  const isShootLastOperationTypeControlPlaneMigrating = computed(() => {
    return shootLastOperation.value.type === 'Migrate' || (shootLastOperation.value.type === 'Restore' && shootLastOperation.value.state !== 'Succeeded')
  })

  const shootLastOperationTypeControlPlaneMigrationMessage = computed(() => {
    switch (shootLastOperation.value.type) {
      case 'Migrate':
        return 'Deleting Resources on old Seed'
      case 'Restore':
        return 'Creating Resources on new Seed'
    }
    return ''
  })

  const shootLastOperation = computed(() => {
    return get(shootItem.value, ['status', 'lastOperation'], {})
  })

  const shootLastErrors = computed(() => {
    return get(shootItem.value, ['status', 'lastErrors'], [])
  })

  const shootConditions = computed(() => {
    return get(shootItem.value, ['status', 'conditions'], [])
  })

  const shootConstraints = computed(() => {
    return get(shootItem.value, ['status', 'constraints'], [])
  })

  const shootCredentialsRotation = computed(() => {
    return get(shootItem.value, ['status', 'credentials', 'rotation'], {})
  })

  const shootObservedGeneration = computed(() => {
    return get(shootItem.value, ['status', 'observedGeneration'])
  })

  const shootTechnicalId = computed(() => {
    return get(shootItem.value, ['status', 'technicalID'])
  })

  const lastMaintenance = computed(() => {
    return get(shootStatus.value, ['lastMaintenance'], {})
  })

  const isLastMaintenanceFailed = computed(() => {
    return lastMaintenance.value.state === 'Failed'
  })

  const hibernationPossibleConstraint = computed(() => {
    return find(shootConstraints.value, ['type', 'HibernationPossible'])
  })

  const isHibernationPossible = computed(() => {
    const status = get(hibernationPossibleConstraint.value, ['status'], 'True')
    return status !== 'False'
  })

  const hibernationPossibleMessage = computed(() => {
    return get(hibernationPossibleConstraint.value, ['message'], 'Hibernation currently not possible')
  })

  const maintenancePreconditionSatisfiedConstraint = computed(() => {
    const constraints = shootConstraints.value
    return find(constraints, ['type', 'MaintenancePreconditionsSatisfied'])
  })

  const isMaintenancePreconditionSatisfied = computed(() => {
    const status = get(maintenancePreconditionSatisfiedConstraint.value, ['status'], 'True')
    return status !== 'False'
  })

  const maintenancePreconditionSatisfiedMessage = computed(() => {
    return get(maintenancePreconditionSatisfiedConstraint.value, ['message'], 'It may not be safe to trigger maintenance for this cluster')
  })

  const caCertificateValiditiesAcceptableConstraint = computed(() => {
    const constraints = shootConstraints.value
    return find(constraints, ['type', 'CACertificateValiditiesAcceptable'])
  })

  const isCACertificateValiditiesAcceptable = computed(() => {
    const status = get(caCertificateValiditiesAcceptableConstraint.value, ['status'], 'True')
    return status !== 'False'
  })

  const caCertificateValiditiesAcceptableMessage = computed(() => {
    return get(caCertificateValiditiesAcceptableConstraint.value, ['message'], 'There is at least one CA certificate which expires in less than 1y. Consider schduling a Certificate Authorities Rotation for this cluster')
  })

  return {
    shootStatus,
    isShootStatusHibernated,
    isShootLastOperationTypeDelete,
    isShootLastOperationTypeControlPlaneMigrating,
    shootLastOperationTypeControlPlaneMigrationMessage,
    shootLastOperation,
    shootLastErrors,
    shootConditions,
    shootConstraints,
    shootCredentialsRotation,
    shootObservedGeneration,
    shootTechnicalId,
    lastMaintenance,
    isLastMaintenanceFailed,
    hibernationPossibleConstraint,
    isHibernationPossible,
    hibernationPossibleMessage,
    maintenancePreconditionSatisfiedConstraint,
    isMaintenancePreconditionSatisfied,
    maintenancePreconditionSatisfiedMessage,
    caCertificateValiditiesAcceptableConstraint,
    isCACertificateValiditiesAcceptable,
    caCertificateValiditiesAcceptableMessage,
  }
}
