//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import get from 'lodash/get'
import filter from 'lodash/filter'
import find from 'lodash/find'
import flatMap from 'lodash/flatMap'
import head from 'lodash/head'
import compact from 'lodash/compact'

export const rotationTypes = Object.freeze([
  {
    type: 'certificateAuthorities',
    hasRotationStatus: true,
    startOperation: 'rotate-ca-start',
    completionOperation: 'rotate-ca-complete',
    twoStep: true,
    title: 'Certificate Authorities',
  },
  {
    type: 'observability',
    hasRotationStatus: true,
    startOperation: 'rotate-observability-credentials',
    title: 'Observability Passwords',
  },
  {
    type: 'sshKeypair',
    hasRotationStatus: true,
    startOperation: 'rotate-ssh-keypair',
    title: 'SSH Key Pair for Worker Nodes',
  },
  {
    type: 'etcdEncryptionKey',
    hasRotationStatus: true,
    startOperation: 'rotate-etcd-encryption-key-start',
    completionOperation: 'rotate-etcd-encryption-key-complete',
    twoStep: true,
    title: 'ETCD Encryption Key',
  },
  {
    type: 'serviceAccountKey',
    hasRotationStatus: true,
    startOperation: 'rotate-serviceaccount-key-start',
    completionOperation: 'rotate-serviceaccount-key-complete',
    twoStep: true,
    title: 'ServiceAccount Token Signing Key',
  },
  {
    type: 'ALL_CREDENTIALS',
    startOperation: 'rotate-credentials-start',
    completionOperation: 'rotate-credentials-complete',
    title: 'Rotate All Credentials',
    twoStep: true,
  },
])

export const twoStepRotationTypes = Object.freeze(filter(rotationTypes, {
  hasRotationStatus: true,
  twoStep: true,
}))

export function useShootStatusCredentialRotation (state, options = {}) {
  options.type ??= 'ALL_CREDENTIALS'

  const shootCredentialsRotation = computed(() => get(state.value, ['status', 'credentials', 'rotation'], {}))

  const shootCredentialsRotationAggregatedPhase = computed(() => {
    let preparedRotationsCount = 0
    let completedPhasesCount = 0
    const unpreparedRotations = []
    for (const rotationType of twoStepRotationTypes) {
      // use simple for loop to support early exit (immediately return in case of progressing phase)
      const rotationStatus = shootCredentialsRotation.value?.[rotationType.type]
      if (['Preparing', 'Completing'].includes(rotationStatus?.phase)) {
        return {
          type: rotationStatus.phase,
          caption: rotationStatus.phase,
        }
      }
      if (!rotationStatus || rotationStatus?.phase === 'Completed') {
        // count not yet rotated rotation types as completed as they are technically ready for step 1 (preparing)
        completedPhasesCount++
      }
      if (rotationStatus?.phase === 'Prepared') {
        preparedRotationsCount++
      } else if (rotationType.twoStep) {
        unpreparedRotations.push(rotationType)
      }
    }

    const numberOfTwoStepOperations = twoStepRotationTypes.length
    if (preparedRotationsCount > 0) {
      if (preparedRotationsCount === numberOfTwoStepOperations) {
        const type = 'Prepared'
        return {
          type,
          caption: type,
        }
      }

      return {
        type: 'Prepared',
        caption: `Prepared ${preparedRotationsCount}/${numberOfTwoStepOperations}`,
        incomplete: true,
        unpreparedRotations,
      }
    }

    if (completedPhasesCount === numberOfTwoStepOperations) {
      const type = 'Completed'
      return {
        type,
        caption: type,
      }
    }

    return undefined
  })

  const rotationStatus = computed(() => {
    return get(shootCredentialsRotation.value, options.type, {})
  })

  const phase = computed(() => {
    if (options.type === 'ALL_CREDENTIALS') {
      return shootCredentialsRotationAggregatedPhase.value ?? {}
    }
    return {
      type: rotationStatus.value.phase,
    }
  })

  const phaseType = computed(() => {
    if (phase.value.type) {
      return phase.value.type
    }
    if (rotationStatus.value.lastInitiationTime &&
         (!rotationStatus.value.lastCompletionTime ||
          rotationStatus.value.lastInitiationTime > rotationStatus.value.lastCompletionTime)
    ) {
      // Show 'Rotating' phase for one-step rotations
      return 'Rotating'
    }
    return undefined
  })

  const rotationType = computed(() => {
    return find(rotationTypes, ['type', options.type])
  })

  const lastInitiationTime = computed(() => {
    if (options.type !== 'ALL_CREDENTIALS') {
      return rotationStatus.value.lastInitiationTime
    }
    // Do not show aggregated initiation time
    return undefined
  })

  const lastCompletionTime = computed(() => {
    if (options.type !== 'ALL_CREDENTIALS') {
      return rotationStatus.value.lastCompletionTime
    }
    const allCompletionTimestamps = compact(flatMap(shootCredentialsRotation.value, 'lastCompletionTime')).sort()
    const requiredNumberOfRotationTimestamps = filter(rotationTypes, 'hasRotationStatus').length

    if (requiredNumberOfRotationTimestamps === allCompletionTimestamps.length) {
      return head(allCompletionTimestamps)
    }
    return undefined
  })

  return {
    shootCredentialsRotationAggregatedPhase,
    phase,
    phaseType,
    rotationType,
    lastInitiationTime,
    lastCompletionTime,
  }
}
