//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { reactive } from 'vue'

import GShootCredentialRotationCard from '@/components/ShootDetails/GShootCredentialRotationCard.vue'
import GCredentialTile from '@/components/GCredentialTile.vue'
import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials.vue'

const { createPlugins } = global.fixtures.helper

describe('components', () => {
  describe('g-shoot-credential-rotation-card', () => {
    let shootItem
    let pinia

    function mountShootCredentialRotationCard (props) {
      return mount(GShootCredentialRotationCard, {
        global: {
          plugins: [
            ...createPlugins(),
            pinia,
          ],
        },
        props,
      })
    }

    beforeEach(() => {
      pinia = createTestingPinia({
        stubActions: false,
        initialState: {
          authn: {
            user: {
              email: 'test@example.org',
              isAdmin: false,
            },
          },
        },
      })
      shootItem = reactive({
        spec: {
          kubernetes: {
            enableStaticTokenKubeconfig: true,
          },
          provider: {
            workers: [
              {},
            ],
          },
        },
        status: {
          credentials: {
            rotation: {
              certificateAuthorities: {
                phase: 'Prepared',
                lastInitiationTime: '2022-07-05T09:22:33Z',
                lastCompletionTime: '2022-07-05T08:39:03Z',
              },
              sshKeypair: {
                lastInitiationTime: '2022-07-05T09:22:33Z',
                lastCompletionTime: '2022-07-05T09:31:14Z',
              },
              observability: {
                lastInitiationTime: '2022-07-05T10:01:02Z',
                lastCompletionTime: '2022-07-05T10:01:42Z',
              },
              etcdEncryptionKey: {
                phase: 'Completing',
                lastInitiationTime: '2022-07-05T09:22:33Z',
                lastCompletionTime: '2022-06-27T08:25:58Z',
              },
              serviceAccountKey: {
                phase: 'Completed',
                lastInitiationTime: '2022-07-05T09:22:33Z',
                lastCompletionTime: '2022-07-05T09:47:32Z',
              },
            },
          },
          constraints: [],
        },
      })
    })

    describe('Show or hide credential tiles', () => {
      it('should have all credential tiles', () => {
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const credentialWrappers = wrapper.findAllComponents(GCredentialTile)
        expect(credentialWrappers.length).toBe(7)
      })

      it('should hide not available tiles', () => {
        shootItem.spec.kubernetes.enableStaticTokenKubeconfig = false
        shootItem.spec.purpose = 'testing'
        delete shootItem.spec.provider.workers

        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const credentialWrappers = wrapper.findAllComponents(GCredentialTile)
        expect(credentialWrappers.length).toBe(4)
      })
    })

    describe('Credential tiles', () => {
      it('should compute phases', () => {
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          allWrapper,
          ,
          certificateAuthoritiesWrapper,
          ,
          ,
          etcdEncryptionKeyWrapper,
          serviceAccountKeyWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

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
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          allWrapper,
          ,
          certificateAuthoritiesWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

        expect(certificateAuthoritiesWrapper.vm.lastInitiationTime).toBe('2022-07-05T09:22:33Z')
        expect(certificateAuthoritiesWrapper.vm.lastCompletionTime).toBe('2022-07-05T08:39:03Z')

        // no lastInitiationTime for overall tile
        expect(allWrapper.vm.lastInitiationTime).toBeUndefined()

        // no lastCompletionTime if enableStaticTokenKubeconfig is true and kubeconfig value is not set
        expect(allWrapper.vm.lastCompletionTime).toBeUndefined()
        shootItem.spec.kubernetes.enableStaticTokenKubeconfig = false
        expect(allWrapper.vm.lastCompletionTime).toBe('2022-06-27T08:25:58Z')

        // no lastCompletionTime if lastCompletionTime is not set for all items
        shootItem.status.credentials.rotation.observability.lastCompletionTime = undefined
        expect(allWrapper.vm.lastCompletionTime).toBeUndefined()
      })

      it('should show warning in case CACertificateValiditiesAcceptable constraint is false', async () => {
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          ,
          ,
          certificateAuthoritiesWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

        expect(certificateAuthoritiesWrapper.vm.iconColor).toBe('primary')

        shootItem.status.constraints.push(
          {
            type: 'CACertificateValiditiesAcceptable',
            status: 'False',
          },
        )
        await certificateAuthoritiesWrapper.vm.$forceUpdate()

        expect(certificateAuthoritiesWrapper.vm.iconColor).toBe('warning')
      })

      it('should compute phaseType', () => {
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          ,
          ,
          certificateAuthoritiesWrapper,
          observabilityRotationWrapper,
          sshKeyWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

        expect(certificateAuthoritiesWrapper.vm.phaseType).toBe('Prepared')
        expect(certificateAuthoritiesWrapper.vm.isProgressing).toBe(false)

        expect(observabilityRotationWrapper.vm.phaseType).toBeUndefined()
        expect(observabilityRotationWrapper.vm.isProgressing).toBe(false)

        expect(sshKeyWrapper.vm.phaseType).toBeUndefined()
        expect(sshKeyWrapper.vm.isProgressing).toBe(false)
      })

      it('should compute progressing phaseType for one-step rotations', () => {
        delete shootItem.status.credentials.rotation.sshKeypair.lastCompletionTime // only lastInitiationTime timestamp
        shootItem.status.credentials.rotation.observability.lastInitiationTime = '2022-08-05T10:01:42Z' // lastInitiationTime > lastCompletionTime

        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          ,
          ,
          ,
          observabilityRotationWrapper,
          sshKeyWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

        expect(observabilityRotationWrapper.vm.phaseType).toBe('Rotating')
        expect(observabilityRotationWrapper.vm.isProgressing).toBe(true)

        expect(sshKeyWrapper.vm.phaseType).toBe('Rotating')
        expect(sshKeyWrapper.vm.isProgressing).toBe(true)
      })
    })

    describe('g-shoot-action-rotate-credentials', () => {
      let allRotationWrapper
      let certificateAuthoritiesRotationWrapper
      let observabilityRotationWrapper
      let etcdEncryptionKeyRotationWrapper
      let serviceAccountKeyRotationWrapper

      beforeEach(async () => {
        const wrapper = mountShootCredentialRotationCard({
          shootItem,
        })
        const [
          allTileWrapper,
          ,
          certificateAuthoritiesTileWrapper,
          observabilityTileWrapper,
          ,
          etcdEncryptionKeyTileWrapper,
          serviceAccountKeyTileWrapper,
        ] = wrapper.findAllComponents(GCredentialTile)

        allRotationWrapper = allTileWrapper.findComponent(GShootActionRotateCredentials)
        certificateAuthoritiesRotationWrapper = certificateAuthoritiesTileWrapper.findComponent(GShootActionRotateCredentials)
        observabilityRotationWrapper = observabilityTileWrapper.findComponent(GShootActionRotateCredentials)
        etcdEncryptionKeyRotationWrapper = etcdEncryptionKeyTileWrapper.findComponent(GShootActionRotateCredentials)
        serviceAccountKeyRotationWrapper = serviceAccountKeyTileWrapper.findComponent(GShootActionRotateCredentials)
      })

      it('should compute operation', () => {
        expect(allRotationWrapper.vm.operation).toBe(allRotationWrapper.vm.completionOperation)
        expect(certificateAuthoritiesRotationWrapper.vm.operation).toBe(certificateAuthoritiesRotationWrapper.vm.completionOperation)
        expect(etcdEncryptionKeyRotationWrapper.vm.operation).toBe(etcdEncryptionKeyRotationWrapper.vm.completionOperation)
        expect(serviceAccountKeyRotationWrapper.vm.operation).toBe(serviceAccountKeyRotationWrapper.vm.startOperation)
      })

      it('should compute mode', () => {
        expect(allRotationWrapper.vm.mode).toBe('COMPLETE')
        expect(certificateAuthoritiesRotationWrapper.vm.mode).toBe('COMPLETE')
        expect(observabilityRotationWrapper.vm.mode).toBe('ROTATE')
        expect(etcdEncryptionKeyRotationWrapper.vm.mode).toBe('COMPLETE')
        expect(serviceAccountKeyRotationWrapper.vm.mode).toBe('START')
      })
    })
  })
})
