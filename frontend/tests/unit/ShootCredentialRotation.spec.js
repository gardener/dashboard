//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import EventEmitter from 'events'
import Vuex from 'vuex'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'

// Components
import ShootCredentialRotationCard from '@/components/ShootDetails/ShootCredentialRotationCard'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('ShootCredentialRotation.vue', () => {
  const localVue = createLocalVue()
  localVue.use(Vuelidate)
  localVue.use(Vuex)

  let vuetify
  let store
  let shootItem

  beforeEach(async () => {
    shootItem = {
      spec: {
        kubernetes: {
          enableStaticTokenKubeconfig: true
        }
      },
      status: {
        credentials: {
          rotation: {
            certificateAuthorities: {
              phase: 'Prepared',
              lastInitiationTime: '2022-07-05T09:22:33Z',
              lastCompletionTime: '2022-07-05T08:39:03Z'
            },
            sshKeypair: {
              lastInitiationTime: '2022-07-05T09:22:33Z',
              lastCompletionTime: '2022-07-05T09:31:14Z'
            },
            observability: {
              lastInitiationTime: '2022-07-05T10:01:02Z',
              lastCompletionTime: '2022-07-05T10:01:42Z'
            },
            etcdEncryptionKey: {
              phase: 'Completing',
              lastInitiationTime: '2022-07-05T09:22:33Z',
              lastCompletionTime: '2022-06-27T08:25:58Z'
            },
            serviceAccountKey: {
              phase: 'Completed',
              lastInitiationTime: '2022-07-05T09:22:33Z',
              lastCompletionTime: '2022-07-05T09:47:32Z'
            }
          }
        },
        constraints: []
      }
    }

    vuetify = new Vuetify()
    store = new Vuex.Store({
      getters: {
        isAdmin: jest.fn().mockReturnValue(true)
      }
    })
  })

  describe('ShootCredentialRotationCard.vue', () => {
    it('should have all credential tiles', () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      expect(credentialWrappers.length).toBe(7)
    })

    it('should hide not available tiles', () => {
      shootItem.spec.kubernetes.enableStaticTokenKubeconfig = false
      shootItem.spec.purpose = 'testing'

      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      expect(credentialWrappers.length).toBe(5)
    })
  })

  describe('CredentialTile.vue', () => {
    it('should compute phase', () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [allWrapper, , certificateAuthoritiesWrapper, , , etcdEncryptionKeyWrapper, serviceAccountKeyWrapper] = credentialWrappers.wrappers

      expect(certificateAuthoritiesWrapper.vm.phase).toEqual({ type: 'Prepared' })
      expect(certificateAuthoritiesWrapper.vm.phaseColor).toBe('primary')

      expect(etcdEncryptionKeyWrapper.vm.phase).toEqual({ type: 'Completing' })
      expect(etcdEncryptionKeyWrapper.vm.phaseColor).toBe('info')

      expect(serviceAccountKeyWrapper.vm.phase).toEqual({ type: 'Completed' })
      expect(serviceAccountKeyWrapper.vm.phaseColor).toBe('primary')

      expect(allWrapper.vm.phase).toEqual({ caption: 'Completing', type: 'Completing' })
      expect(allWrapper.vm.phaseCaption).toBe('Completing')
      expect(allWrapper.vm.phaseColor).toBe('info')
    })

    it('should compute lastInitiationTime / lastCompletionTime', () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [allWrapper, , certificateAuthoritiesWrapper] = credentialWrappers.wrappers

      expect(certificateAuthoritiesWrapper.vm.lastInitiationTime).toBe('2022-07-05T09:22:33Z')
      expect(certificateAuthoritiesWrapper.vm.lastCompletionTime).toBe('2022-07-05T08:39:03Z')

      // no lastInitiationTime for overall tile
      expect(allWrapper.vm.lastInitiationTime).toBe(undefined)

      // no lastCompletionTime if enableStaticTokenKubeconfig is true and kubeconfig value is not set
      expect(allWrapper.vm.lastCompletionTime).toBe(undefined)

      shootItem.spec.kubernetes.enableStaticTokenKubeconfig = false
      expect(allWrapper.vm.lastCompletionTime).toBe('2022-06-27T08:25:58Z')

      // no lastCompletionTime if lastCompletionTime is not set for all items
      shootItem.status.credentials.rotation.observability.lastCompletionTime = undefined
      expect(allWrapper.vm.lastCompletionTime).toBe(undefined)
    })

    it('should show warning in case CACertificateValiditiesAcceptable constraint is false', async () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        },
        mocks: {
          $bus: new EventEmitter()
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [, , certificateAuthoritiesWrapper] = credentialWrappers.wrappers

      let shootMessagesWrapper = certificateAuthoritiesWrapper.findComponent({ name: 'shoot-messages' })
      expect(shootMessagesWrapper.exists()).toBe(false)
      expect(certificateAuthoritiesWrapper.vm.iconColor).toBe('primary')

      shootItem.status.constraints.push(
        {
          type: 'CACertificateValiditiesAcceptable',
          status: 'False'
        }
      )
      await certificateAuthoritiesWrapper.vm.$forceUpdate()

      shootMessagesWrapper = certificateAuthoritiesWrapper.findComponent({ name: 'shoot-messages' })
      expect(shootMessagesWrapper.exists()).toBe(true)
      expect(certificateAuthoritiesWrapper.vm.iconColor).toBe('warning')
    })

    it('should compute phaseType', () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [, , certificateAuthoritiesWrapper, observabilityRotationWrapper, sshKeyWrapper] = credentialWrappers.wrappers

      expect(certificateAuthoritiesWrapper.vm.phaseType).toEqual('Prepared')
      expect(certificateAuthoritiesWrapper.vm.isProgressing).toBe(false)

      expect(observabilityRotationWrapper.vm.phaseType).toEqual(undefined)
      expect(observabilityRotationWrapper.vm.isProgressing).toBe(false)

      expect(sshKeyWrapper.vm.phaseType).toEqual(undefined)
      expect(sshKeyWrapper.vm.isProgressing).toBe(false)
    })

    it('should compute progressing phaseType for one-step rotations', () => {
      delete shootItem.status.credentials.rotation.sshKeypair.lastCompletionTime // only lastInitiationTime timestamp
      shootItem.status.credentials.rotation.observability.lastInitiationTime = '2022-08-05T10:01:42Z' // lastInitiationTime > lastCompletionTime

      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [, , , observabilityRotationWrapper, sshKeyWrapper] = credentialWrappers.wrappers

      expect(observabilityRotationWrapper.vm.phaseType).toEqual('Rotating')
      expect(observabilityRotationWrapper.vm.isProgressing).toBe(true)

      expect(sshKeyWrapper.vm.phaseType).toEqual('Rotating')
      expect(sshKeyWrapper.vm.isProgressing).toBe(true)
    })
  })

  describe('RotateCredentials.vue', () => {
    let allRotationWrapper
    let certificateAuthoritiesRotationWrapper
    let observabilityRotationWrapper
    let etcdEncryptionKeyRotationWrapper
    let serviceAccountKeyRotationWrapper

    beforeEach(async () => {
      const cardWrapper = mount(ShootCredentialRotationCard, {
        localVue,
        store,
        vuetify,
        propsData: {
          shootItem
        }
      })
      const credentialWrappers = cardWrapper.findAllComponents({ name: 'credential-tile' })
      const [allTileWrapper, , certificateAuthoritiesTileWrapper, observabilityTileWrapper, , etcdEncryptionKeyTileWrapper, serviceAccountKeyTileWrapper] = credentialWrappers.wrappers

      allRotationWrapper = allTileWrapper.findComponent({ name: 'rotate-credentials' })
      certificateAuthoritiesRotationWrapper = certificateAuthoritiesTileWrapper.findComponent({ name: 'rotate-credentials' })
      observabilityRotationWrapper = observabilityTileWrapper.findComponent({ name: 'rotate-credentials' })
      etcdEncryptionKeyRotationWrapper = etcdEncryptionKeyTileWrapper.findComponent({ name: 'rotate-credentials' })
      serviceAccountKeyRotationWrapper = serviceAccountKeyTileWrapper.findComponent({ name: 'rotate-credentials' })
    })

    it('should compute operation', () => {
      expect(allRotationWrapper.vm.operation).toEqual(allRotationWrapper.vm.completionOperation)
      expect(certificateAuthoritiesRotationWrapper.vm.operation).toEqual(certificateAuthoritiesRotationWrapper.vm.completionOperation)
      expect(etcdEncryptionKeyRotationWrapper.vm.operation).toEqual(etcdEncryptionKeyRotationWrapper.vm.completionOperation)
      expect(serviceAccountKeyRotationWrapper.vm.operation).toEqual(serviceAccountKeyRotationWrapper.vm.startOperation)
    })

    it('should compute mode', () => {
      expect(allRotationWrapper.vm.mode).toEqual('COMPLETE')
      expect(certificateAuthoritiesRotationWrapper.vm.mode).toEqual('COMPLETE')
      expect(observabilityRotationWrapper.vm.mode).toEqual('ROTATE')
      expect(etcdEncryptionKeyRotationWrapper.vm.mode).toEqual('COMPLETE')
      expect(serviceAccountKeyRotationWrapper.vm.mode).toEqual('START')
    })
  })
})
