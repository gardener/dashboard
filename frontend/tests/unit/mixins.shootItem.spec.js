//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shootItem } from '@/mixins/shootItem'
import { rotationTypes } from '@/utils/credentialsRotation'
import { shallowMount } from '@vue/test-utils'

import find from 'lodash/find'

describe('shootItem', () => {
  const Component = {
    render () {},
    mixins: [shootItem]
  }

  describe('shootStatusCredentialsRotationAggregatedPhase', () => {
    let shootItemProp

    beforeEach(async () => {
      shootItemProp = {
        spec: {
          kubernetes: {
            enableStaticTokenKubeconfig: true
          }
        },
        status: {
          credentials: {
            rotation: {
              certificateAuthorities: {
                phase: 'Prepared'
              },
              etcdEncryptionKey: {
                phase: 'Completing'
              },
              serviceAccountKey: {
                phase: 'Completed'
              }
            }
          }
        }
      }
    })

    it('should return progressing phase', () => {
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem: shootItemProp
        }
      })
      expect(wrapper.vm.shootStatusCredentialsRotationAggregatedPhase).toEqual({ type: 'Completing', caption: 'Completing' })
    })

    it('should return completed phase', () => {
      shootItemProp.status.credentials.rotation.certificateAuthorities.phase = 'Completed'
      shootItemProp.status.credentials.rotation.etcdEncryptionKey.phase = 'Completed'
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem: shootItemProp
        }
      })
      expect(wrapper.vm.shootStatusCredentialsRotationAggregatedPhase).toEqual({ type: 'Completed', caption: 'Completed' })
    })

    it('should return prepared phase', () => {
      shootItemProp.status.credentials.rotation.etcdEncryptionKey.phase = 'Prepared'
      shootItemProp.status.credentials.rotation.serviceAccountKey.phase = 'Prepared'
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem: shootItemProp
        }
      })
      expect(wrapper.vm.shootStatusCredentialsRotationAggregatedPhase).toEqual({ type: 'Prepared', caption: 'Prepared' })
    })

    it('should return incomplete prepared phase', () => {
      shootItemProp.status.credentials.rotation.etcdEncryptionKey.phase = 'Prepared'
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem: shootItemProp
        }
      })
      const unpreparedRotations = [
        find(rotationTypes, ['type', 'serviceAccountKey'])
      ]

      expect(wrapper.vm.shootStatusCredentialsRotationAggregatedPhase).toEqual({ type: 'Prepared', caption: 'Prepared 2/3', incomplete: true, unpreparedRotations })
    })
  })
})
