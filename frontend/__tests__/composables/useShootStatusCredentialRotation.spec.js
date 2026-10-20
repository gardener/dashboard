//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
                serviceAccountKey: {
                  phase: 'Completed',
                },
              },
            },
          },
        }
      })

      it('should return progressing phase', () => {
        set(shootItem.value, ['status', 'credentials', 'rotation', 'serviceAccountKey', 'phase'], 'Completing')
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
          caption: 'Prepared 1/2',
          incomplete: true,
          unpreparedRotations: [
            find(rotationTypes, ['type', 'serviceAccountKey']),
          ],
        })
      })
    })

    describe('#lastCompletionTime', () => {
      beforeEach(() => {
        shootItem.value = {
          spec: {
            provider: {
              workers: [
                {},
              ],
              workersSettings: {
                sshAccess: {
                  enabled: true,
                },
              },
            },
          },
          status: {
            credentials: {
              rotation: {
                certificateAuthorities: {
                  lastCompletionTime: '2022-07-02T00:00:00Z',
                },
                observability: {
                  lastCompletionTime: '2022-07-03T00:00:00Z',
                },
                sshKeypair: {
                  lastCompletionTime: '2022-07-01T00:00:00Z',
                },
                etcdEncryptionKey: {
                  lastCompletionTime: '2022-07-04T00:00:00Z',
                },
                serviceAccountKey: {
                  lastCompletionTime: '2022-07-05T00:00:00Z',
                },
              },
            },
          },
        }
      })

      it('should include SSH key pair rotation when SSH access is enabled', () => {
        expect(reactiveShootItem.lastCompletionTime).toBe('2022-07-01T00:00:00Z')

        unset(shootItem.value, ['status', 'credentials', 'rotation', 'sshKeypair'])
        expect(reactiveShootItem.lastCompletionTime).toBeUndefined()
      })

      it('should exclude SSH key pair rotation when SSH access is disabled', () => {
        set(shootItem.value, ['spec', 'provider', 'workersSettings', 'sshAccess', 'enabled'], false)
        expect(reactiveShootItem.lastCompletionTime).toBe('2022-07-02T00:00:00Z')

        unset(shootItem.value, ['status', 'credentials', 'rotation', 'sshKeypair'])
        expect(reactiveShootItem.lastCompletionTime).toBe('2022-07-02T00:00:00Z')
      })

      it('should exclude SSH key pair rotation when there are no worker groups', () => {
        set(shootItem.value, ['spec', 'provider', 'workers'], [])
        expect(reactiveShootItem.lastCompletionTime).toBe('2022-07-02T00:00:00Z')
      })
    })
  })
})
