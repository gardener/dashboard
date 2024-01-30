//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useShootStore } from '@/store/shoot'
import { useConfigStore } from '@/store/config'

import shootItem from '@/mixins/shootItem'

describe('mixins', () => {
  describe('shootItem', () => {
    const Component = {
      render () { },
      mixins: [shootItem],
    }

    it('should compute isShootMarkedForDeletion correctly', () => {
      const shootItem = {
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/deletion': 'True',
          },
          deletionTimestamp: '2023-01-01T20:57:01Z',
        },
      }

      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)
    })

    it('should compute isShootMarkedForForceDeletion correctly', () => {
      const shootItem = {
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/force-deletion': 'True',
          },
          deletionTimestamp: '2023-01-01T20:57:01Z',
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(true)
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)
    })

    it('should compute isShootReconciliationDeactivated correctly', () => {
      const shootItem = {
        metadata: {
          annotations: {
            'shoot.gardener.cloud/ignore': 'True',
          },
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootReconciliationDeactivated).toBe(true)
    })

    it('should compute isShootStatusHibernationProgressing correctly', async () => {
      let shootItem = {
        spec: {
          hibernation: {
            enabled: true,
          },
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(true)

      shootItem = {
        spec: {
          hibernation: {
            enabled: true,
          },
        },
        status: {
          hibernated: true,
        },
      }
      await wrapper.setProps({ shootItem })

      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(false)
    })

    it('should compute isCustomShootDomain correctly', () => {
      const shootItem = {
        spec: {
          dns: {
            providers: [
              { primary: true },
            ],
          },
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isCustomShootDomain).toBe(true)
    })

    it('should compute isShootLastOperationTypeDelete correctly', () => {
      const shootItem = {
        status: {
          lastOperation: {
            type: 'Delete',
          },
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(true)
    })

    it('should compute isShootLastOperationTypeControlPlaneMigrating correctly', async () => {
      let shootItem = {
        status: {
          lastOperation: {
            type: 'Migrate',
          },
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)

      shootItem = {
        status: {
          lastOperation: {
            type: 'Restore',
          },
        },
      }
      await wrapper.setProps({ shootItem })

      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)
    })

    it('should compute isHibernationPossible correctly', () => {
      const shootItem = {
        status: {
          constraints: [
            {
              type: 'HibernationPossible',
              status: 'False',
            },
          ],
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isHibernationPossible).toBe(false)
    })

    it('should compute isMaintenancePreconditionSatisfied correctly', () => {
      const shootItem = {
        status: {
          constraints: [
            {
              type: 'MaintenancePreconditionsSatisfied',
              status: 'False',
            },
          ],
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(false)
    })

    it('should compute isCACertificateValiditiesAcceptable correctly', () => {
      const shootItem = {
        status: {
          constraints: [
            {
              type: 'CACertificateValiditiesAcceptable',
              status: 'False',
            },
          ],
        },
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(false)
    })

    it('should compute isStaleShoot correctly', () => {
      const pinia = createTestingPinia({
        stubActions: false,
      })
      const shootStore = useShootStore(pinia)
      shootStore.isShootActive = () => {
        return true
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem: {},
        },
      })

      expect(wrapper.vm.isStaleShoot).toBe(false)
    })

    it('should compute canForceDeleteShoot correctly', async () => {
      const shootItem = {
        metadata: {
          deletionTimestamp: '2023-01-01T20:57:01Z',
        },
        status: {
          lastErrors: [
            {
              codes: ['ERR_CLEANUP_CLUSTER_RESOURCES'],
            },
          ],
        },
      }
      const pinia = createTestingPinia({
        stubActions: false,
      })
      const configStore = useConfigStore(pinia)
      configStore.features = {
        shootForceDeletionEnabled: true,
      }
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.canForceDeleteShoot).toBe(true)
    })
  })
})
