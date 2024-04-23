//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  shallowRef,
} from 'vue'
import { shallowMount } from '@vue/test-utils'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'

import { useProvideShootItem } from '@/composables/useShootItem'

import {
  set,
  cloneDeep,
  unset,
} from '@/lodash'

describe('composables', () => {
  describe('useProvideShootItem', () => {
    let shootItem

    function setObjectValue (object, path, value) {
      object = cloneDeep(object)
      if (value) {
        return set(object, path, value)
      }
      unset(object, path)
      return object
    }

    function setShootItem (path, value) {
      shootItem.value = setObjectValue(shootItem.value, path, value)
      shootStore.state.shoots[shootItem.value.metadata.uid] = shootItem.value
    }

    let shootStore
    let authzStore

    beforeEach(() => {
      shootItem = shallowRef({
        metadata: {
          namespace: 'garden-test',
          name: 'foo',
          uid: '1d8a140f-3e0d-4d80-a044-a2e8473c0e2d',
        },
      })
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace(shootItem.value.metadata.namespace)
      shootStore = useShootStore()
    })

    const Component = {
      setup () {
        const isStaleShoot = computed(() => {
          return !shootStore.isShootActive(shootItem.value.metadata.uid)
        })

        return {
          ...useProvideShootItem(shootItem),
          isStaleShoot,
        }
      },
      render () {},
    }

    it('should compute isShootMarkedForDeletion correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('metadata.annotations["confirmation.gardener.cloud/deletion"]', 'True')
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(false)

      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(true)

      setShootItem('metadata.annotations["confirmation.gardener.cloud/deletion"]', 'Foo')
      expect(wrapper.vm.isShootMarkedForDeletion).toBe(false)
    })

    it('should compute isShootMarkedForForceDeletion correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('metadata.annotations["confirmation.gardener.cloud/force-deletion"]', 'True')
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(false)

      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(true)

      setShootItem('metadata.annotations["confirmation.gardener.cloud/force-deletion"]', 'Foo')
      expect(wrapper.vm.isShootMarkedForForceDeletion).toBe(false)
    })

    it('should compute isShootReconciliationDeactivated correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('metadata.annotations["shoot.gardener.cloud/ignore"]', 'True')
      expect(wrapper.vm.isShootReconciliationDeactivated).toBe(true)

      setShootItem('metadata.annotations["shoot.gardener.cloud/ignore"]', 'Foo')
      expect(wrapper.vm.isShootReconciliationDeactivated).toBe(false)
    })

    it('should compute isShootStatusHibernationProgressing correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('spec.hibernation.enabled', true)
      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(true)

      setShootItem('status.hibernated', true)
      expect(wrapper.vm.isShootSettingHibernated).toBe(true)
      expect(wrapper.vm.isShootStatusHibernationProgressing).toBe(false)
    })

    it('should compute isCustomShootDomain correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('spec.dns.providers', [
        { primary: false },
      ])
      expect(wrapper.vm.isCustomShootDomain).toBe(false)

      setShootItem('spec.dns.providers', [
        { primary: false },
        { primary: true },
      ])
      expect(wrapper.vm.isCustomShootDomain).toBe(true)
    })

    it('should compute isShootLastOperationTypeDelete correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('status.lastOperation.type', 'Delete')
      expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(true)

      setShootItem('status.lastOperation.type', 'Foo')
      expect(wrapper.vm.isShootLastOperationTypeDelete).toBe(false)
    })

    it('should compute isShootLastOperationTypeControlPlaneMigrating correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('status.lastOperation', {
        type: 'Migrate',
        state: 'Succeeded',
      })
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)

      setShootItem('status.lastOperation.type', 'Foo')
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      setShootItem('status.lastOperation.type', 'Restore')
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      setShootItem('status.lastOperation.state', undefined)
      expect(wrapper.vm.isShootLastOperationTypeControlPlaneMigrating).toBe(true)
    })

    it('should compute isHibernationPossible correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('status.constraints', [{
        type: 'HibernationPossible',
        status: 'False',
      }])
      expect(wrapper.vm.isHibernationPossible).toBe(false)

      setShootItem('status.constraints', [{
        type: 'HibernationPossible',
        status: 'True',
      }])
      expect(wrapper.vm.isHibernationPossible).toBe(true)

      setShootItem('status.constraints', [])
      expect(wrapper.vm.isHibernationPossible).toBe(true)
    })

    it('should compute isMaintenancePreconditionSatisfied correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('status.constraints', [{
        type: 'MaintenancePreconditionsSatisfied',
        status: 'False',
      }])
      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(false)

      setShootItem('status.constraints', [{
        type: 'MaintenancePreconditionsSatisfied',
        status: 'True',
      }])
      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(true)

      setShootItem('status.constraints', [])
      expect(wrapper.vm.isMaintenancePreconditionSatisfied).toBe(true)
    })

    it('should compute isCACertificateValiditiesAcceptable correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('status.constraints', [{
        type: 'CACertificateValiditiesAcceptable',
        status: 'False',
      }])
      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(false)

      setShootItem('status.constraints', [{
        type: 'CACertificateValiditiesAcceptable',
        status: 'True',
      }])
      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(true)

      setShootItem('status.constraints', [])
      expect(wrapper.vm.isCACertificateValiditiesAcceptable).toBe(true)
    })

    it('should compute isStaleShoot correctly', () => {
      authzStore.setNamespace('_all')
      shootStore.state.shootListFilters = {
        onlyShootsWithIssues: true,
        progressing: true,
      }
      const wrapper = shallowMount(Component)
      setShootItem('metadata.labels["shoot.gardener.cloud/status"]', 'progressing')
      expect(wrapper.vm.isStaleShoot).toBe(true)

      setShootItem('metadata.labels["shoot.gardener.cloud/status"]', undefined)
      expect(wrapper.vm.isStaleShoot).toBe(false)
    })

    it('should compute canForceDeleteShoot correctly', () => {
      const wrapper = shallowMount(Component)
      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(wrapper.vm.canForceDeleteShoot).toBe(false)

      setShootItem('status.lastErrors', [{
        codes: ['ERR_CLEANUP_CLUSTER_RESOURCES'],
      }])
      expect(wrapper.vm.canForceDeleteShoot).toBe(true)

      setShootItem('metadata.deletionTimestamp', undefined)
      expect(wrapper.vm.canForceDeleteShoot).toBe(false)
    })
  })
})
