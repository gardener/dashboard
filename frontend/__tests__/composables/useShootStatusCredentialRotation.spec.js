//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import {
  reactive,
  ref,
} from 'vue'

import {
  rotationTypes,
  useShootStatusCredentialRotation,
} from '@/composables/useShootStatusCredentialRotation'

import set from 'lodash/set'
import unset from 'lodash/unset'
import find from 'lodash/find'

describe('composables', () => {
  describe('useShootStatusCredentialRotation', () => {
    const shootItem = ref(null)
    const reactiveShootItem = reactive(useShootStatusCredentialRotation(shootItem))

    describe('#shootStatusCredentialsRotationAggregatedPhase', () => {
      beforeEach(() => {
        shootItem.value = {
          status: {
            credentials: {
              rotation: {
                certificateAuthorities: {
                  phase: 'Prepared',
                },
                etcdEncryptionKey: {
                  phase: 'Completing',
                },
                serviceAccountKey: {
                  phase: 'Completed',
                },
              },
            },
          },
        }
      })

      it('should return progressing phase', () => {
        expect(reactiveShootItem.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Completing',
          caption: 'Completing',
        })
      })

      it('should return completed phase', () => {
        set(shootItem.value, ['status', 'credentials', 'rotation', 'certificateAuthorities', 'phase'], 'Completed')
        set(shootItem.value, ['status', 'credentials', 'rotation', 'etcdEncryptionKey', 'phase'], 'Completed')
        expect(reactiveShootItem.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Completed',
          caption: 'Completed',
        })
      })

      it('should return prepared phase', () => {
        set(shootItem.value, ['status', 'credentials', 'rotation', 'etcdEncryptionKey', 'phase'], 'Prepared')
        set(shootItem.value, ['status', 'credentials', 'rotation', 'serviceAccountKey', 'phase'], 'Prepared')
        expect(reactiveShootItem.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Prepared',
          caption: 'Prepared',
        })
      })

      it('should return incomplete prepared phase', () => {
      // treat unrotated credentials as unprepared
        unset(shootItem.value, ['status', 'credentials', 'rotation', 'etcdEncryptionKey'])

        expect(reactiveShootItem.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Prepared',
          caption: 'Prepared 1/3',
          incomplete: true,
          unpreparedRotations: [
            find(rotationTypes, ['type', 'etcdEncryptionKey']),
            find(rotationTypes, ['type', 'serviceAccountKey']),
          ],
        })
      })
    })
  })
})
