//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import filter from 'lodash/filter'
import find from 'lodash/find'

import { shootItem } from '@/mixins/shootItem'
import { rotationTypes } from '@/utils/credentialsRotation'

export const shootStatusCredentialRotation = {
  mixins: [shootItem],
  computed: {
    shootStatusCredentialsRotation () {
      return get(this.shootStatus, 'credentials.rotation', {})
    },
    shootStatusCredentialsRotationAggregatedPhase () {
      let preparedRotationsCount = 0
      let completedPhasesCount = 0
      const unpreparedRotations = []
      for (const rotationType of filter(rotationTypes, { hasRotationStatus: true, twoStep: true })) {
        // use simple for loop to support early exit (immediately return in case of progressing phase)
        const rotationStatus = this.shootStatusCredentialsRotation[rotationType.type]
        if (['Preparing', 'Completing'].includes(rotationStatus?.phase)) {
          return {
            type: rotationStatus.phase,
            caption: rotationStatus.phase
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

      const numberOfTwoStepOperations = filter(rotationTypes, { hasRotationStatus: true, twoStep: true }).length
      if (preparedRotationsCount > 0) {
        if (preparedRotationsCount === numberOfTwoStepOperations) {
          const type = 'Prepared'
          return {
            type,
            caption: type
          }
        }

        return {
          caption: `Prepared ${preparedRotationsCount}/${numberOfTwoStepOperations}`,
          type: 'Prepared',
          incomplete: true,
          unpreparedRotations
        }
      }

      if (completedPhasesCount === numberOfTwoStepOperations) {
        const type = 'Completed'
        return {
          type,
          caption: type
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
        type: this.rotationStatus.phase
      }
    },
    phaseType () {
      if (this.phase.type) {
        return this.phase.type
      }
      if ((this.rotationStatus.lastInitiationTime && !this.rotationStatus.lastCompletionTime) ||
          this.rotationStatus.lastInitiationTime > this.rotationStatus.lastCompletionTime) {
        // Show 'Rotating' phase for one step rotations
        return 'Rotating'
      }
      return undefined
    },
    rotationType () {
      return find(rotationTypes, ['type', this.type])
    }
  }
}

export default shootStatusCredentialRotation
