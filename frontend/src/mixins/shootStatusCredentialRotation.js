//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import filter from 'lodash/filter'
import find from 'lodash/find'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import head from 'lodash/head'
import compact from 'lodash/compact'

import { shootItem } from '@/mixins/shootItem'

const rotationTypes = [
  {
    type: 'kubeconfig',
    hasRotationStatus: true,
    startOperation: 'rotate-kubeconfig-credentials',
    title: 'Kubeconfig',
  },
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
]
const twoStepRotationTypes = filter(rotationTypes, {
  hasRotationStatus: true,
  twoStep: true,
})

export const shootStatusCredentialRotation = {
  props: {
    type: {
      type: String,
      required: true,
      validator (value) {
        return map(rotationTypes, 'type').includes(value)
      },
    },
  },
  mixins: [shootItem],
  computed: {
    shootStatusCredentialsRotation () {
      return get(this.shootStatus, 'credentials.rotation', {})
    },
    shootStatusCredentialsRotationAggregatedPhase () {
      let preparedRotationsCount = 0
      let completedPhasesCount = 0
      const unpreparedRotations = []
      for (const rotationType of twoStepRotationTypes) {
        // use simple for loop to support early exit (immediately return in case of progressing phase)
        const rotationStatus = this.shootStatusCredentialsRotation[rotationType.type]
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
          caption: `Prepared ${preparedRotationsCount}/${numberOfTwoStepOperations}`,
          type: 'Prepared',
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
    },
    rotationStatus () {
      return get(this.shootStatusCredentialsRotation, this.type, {})
    },
    phase () {
      if (this.type === 'ALL_CREDENTIALS') {
        return this.shootStatusCredentialsRotationAggregatedPhase ?? {}
      }
      return {
        type: this.rotationStatus.phase,
      }
    },
    phaseType () {
      if (this.phase.type) {
        return this.phase.type
      }
      if (this.rotationStatus.lastInitiationTime &&
         (!this.rotationStatus.lastCompletionTime ||
          this.rotationStatus.lastInitiationTime > this.rotationStatus.lastCompletionTime)
      ) {
        // Show 'Rotating' phase for one step rotations
        return 'Rotating'
      }
      return undefined
    },
    rotationType () {
      return find(rotationTypes, ['type', this.type])
    },
    lastInitiationTime () {
      if (this.type !== 'ALL_CREDENTIALS') {
        return this.rotationStatus.lastInitiationTime
      }
      // Do not show aggregated initiation time
      return undefined
    },
    lastCompletionTime () {
      if (this.type !== 'ALL_CREDENTIALS') {
        return this.rotationStatus.lastCompletionTime
      }
      const allCompletionTimestamps = compact(flatMap(this.shootStatusCredentialsRotation, 'lastCompletionTime')).sort()
      let requiredNumberOfRotationTimestamps = filter(rotationTypes, 'hasRotationStatus').length
      if (!this.shootEnableStaticTokenKubeconfig) {
        requiredNumberOfRotationTimestamps = requiredNumberOfRotationTimestamps - 1
      }

      if (requiredNumberOfRotationTimestamps === allCompletionTimestamps.length) {
        return head(allCompletionTimestamps)
      }
      return undefined
    },
  },
  rotationTypes,
}

export default shootStatusCredentialRotation
