//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { reactive } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useShootStore } from '@/store/shoot'

import shootItem from '@/mixins/shootItem'

describe('mixins', () => {
  describe('shootItem', () => {
    const Component = {
      render () { },
      mixins: [shootItem],
    }

    it('should compute isShootMarkedForDeletion correctly', () => {
      const shootItem = reactive({
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/deletion': 'True',
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(false)

      shootItem.metadata.deletionTimestamp = '2023-01-01T20:57:01Z'
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)

      shootItem.metadata.annotations['confirmation.gardener.cloud/deletion'] = 'Foo'
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(false)
    })

    it('should compute isShootMarkedForForceDeletion correctly', () => {
      const shootItem = reactive({
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/force-deletion': 'True',
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(false)

      shootItem.metadata.deletionTimestamp = '2023-01-01T20:57:01Z'
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(true)

      shootItem.metadata.annotations['confirmation.gardener.cloud/force-deletion'] = 'Foo'
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(false)
    })

    it('should compute isShootReconciliationDeactivated correctly', () => {
      const shootItem = reactive({
        metadata: {
          annotations: {
            'shoot.gardener.cloud/ignore': 'True',
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootReconciliationDeactivated).toBe(true)

      shootItem.metadata.annotations['shoot.gardener.cloud/ignore'] = 'Foo'
      expect(wrapper.vm.isShootReconciliationDeactivated).toBe(false)
    })

    it('should compute isShootStatusHibernationProgressing correctly', () => {
      const shootItem = reactive({
        spec: {
          hibernation: {
            enabled: true,
          },
        },
        status: {
          hibernated: undefined,
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(true)

      shootItem.status.hibernated = true

      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(false)
    })

    it('should compute isCustomShootDomain correctly', () => {
      const shootItem = reactive({
        spec: {
          dns: {
            providers: [{
              primary: false,
            }],
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isCustomShootDomain).toBe(false)

      shootItem.spec.dns.providers.push({ primary: true })
      expect(wrapper.vm.isCustomShootDomain).toBe(true)
    })

    it('should compute isShootLastOperationTypeDelete correctly', () => {
      const shootItem = reactive({
        status: {
          lastOperation: {
            type: 'Delete',
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(true)

      shootItem.status.lastOperation.type = 'Foo'
      expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(false)
    })

    it('should compute isShootLastOperationTypeControlPlaneMigrating correctly', () => {
      const shootItem = reactive({
        status: {
          lastOperation: {
            type: 'Migrate',
            state: 'Succeeded',
          },
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)

      shootItem.status.lastOperation.type = 'Foo'
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      shootItem.status.lastOperation.type = 'Restore'
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      delete shootItem.status.lastOperation.state
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)
    })

    it('should compute isHibernationPossible correctly', () => {
      const shootItem = reactive({
        status: {
          constraints: [
            {
              type: 'HibernationPossible',
              status: 'False',
            },
          ],
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isHibernationPossible).toBe(false)

      shootItem.status.constraints = {
        type: 'HibernationPossible',
        status: 'True',
      }
      expect(wrapper.vm.isHibernationPossible).toBe(true)

      delete shootItem.status.constraints
      expect(wrapper.vm.isHibernationPossible).toBe(true)
    })

    it('should compute isMaintenancePreconditionSatisfied correctly', () => {
      const shootItem = reactive({
        status: {
          constraints: [
            {
              type: 'MaintenancePreconditionsSatisfied',
              status: 'False',
            },
          ],
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(false)

      shootItem.status.constraints = {
        type: 'MaintenancePreconditionsSatisfied',
        status: 'True',
      }
      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(true)

      delete shootItem.status.constraints
      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(true)
    })

    it('should compute isCACertificateValiditiesAcceptable correctly', () => {
      const shootItem = reactive({
        status: {
          constraints: [
            {
              type: 'CACertificateValiditiesAcceptable',
              status: 'False',
            },
          ],
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(false)

      shootItem.status.constraints = {
        type: 'CACertificateValiditiesAcceptable',
        status: 'False',
      }
      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(true)

      delete shootItem.status.constraints
      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(true)
    })

    it('should compute isStaleShoot correctly', () => {
      const shootItem = reactive({
        metadata: {
          uid: '42',
        },
      })
      const pinia = createTestingPinia()
      const shootStore = useShootStore(pinia)
      shootStore.isShootActive.mockImplementation(uid => uid === '42')
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
        global: {
          plugins: [pinia],
        },
      })

      expect(wrapper.vm.isStaleShoot).toBe(false)

      shootItem.metadata.uid = '13'

      expect(wrapper.vm.isStaleShoot).toBe(true)
    })

    it('should compute canForceDeleteShoot correctly', () => {
      const shootItem = reactive({
        metadata: {
          deletionTimestamp: '2023-01-01T20:57:01Z',
        },
        status: {
          lastErrors: [{
            codes: ['ERR_CLEANUP_CLUSTER_RESOURCES'],
          }],
        },
      })
      const wrapper = shallowMount(Component, {
        propsData: {
          shootItem,
        },
      })

      expect(wrapper.vm.canForceDeleteShoot).toBe(true)

      delete shootItem.metadata.deletionTimestamp
      expect(wrapper.vm.canForceDeleteShoot).toBe(false)

      shootItem.metadata.deletionTimestamp = '2023-01-01T20:57:01Z'
      delete shootItem.status.lastErrors
      expect(wrapper.vm.canForceDeleteShoot).toBe(false)
    })
  })
})
