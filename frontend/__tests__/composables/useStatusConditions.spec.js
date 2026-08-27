//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  CONDITION_STATES,
  conditionState,
  isConditionHealthy,
} from '@/composables/useStatusConditions'

describe('composables', () => {
  describe('useStatusConditions', () => {
    it('should classify readiness conditions consistently', () => {
      expect(conditionState({ status: 'False' })).toBe(CONDITION_STATES.ERROR)
      expect(conditionState({ status: 'True', codes: ['ERR_TEST'] })).toBe(CONDITION_STATES.ERROR)
      expect(conditionState({ status: 'Unknown' })).toBe(CONDITION_STATES.UNKNOWN)
      expect(conditionState({ status: 'Progressing' })).toBe(CONDITION_STATES.PROGRESSING)
      expect(conditionState({ status: 'True' })).toBe(CONDITION_STATES.HEALTHY)
      expect(isConditionHealthy({ status: 'True' })).toBe(true)
      expect(isConditionHealthy({ status: 'False' })).toBe(false)
    })

    it('should expose immutable condition states', () => {
      expect(Object.isFrozen(CONDITION_STATES)).toBe(true)
    })
  })
})
