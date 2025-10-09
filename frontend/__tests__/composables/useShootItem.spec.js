//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  shallowRef,
  computed,
  reactive,
} from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'
import { useProjectStore } from '@/store/project'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useSeedStore } from '@/store/seed'
import { useCredentialStore } from '@/store/credential'

import { createShootItemComposable } from '@/composables/useShootItem'

import set from 'lodash/set'
import cloneDeep from 'lodash/cloneDeep'
import unset from 'lodash/unset'

describe('composables', () => {
  describe('useProvideShootItem', () => {
    let shootItem
    let shootStore
    let authzStore
    let projectStore
    let cloudProfileStore
    let seedStore
    let credentialStore
    let reactiveShootItem

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

    beforeEach(() => {
      setActivePinia(createPinia())
      shootItem = shallowRef({
        metadata: {
          namespace: 'garden-test',
          name: 'foo',
          uid: '1d8a140f-3e0d-4d80-a044-a2e8473c0e2d',
        },
      })

      authzStore = useAuthzStore()
      authzStore.setNamespace(shootItem.value.metadata.namespace)
      shootStore = useShootStore()
      projectStore = useProjectStore()
      cloudProfileStore = useCloudProfileStore()
      seedStore = useSeedStore()
      credentialStore = useCredentialStore()

      reactiveShootItem = reactive({
        isStaleShoot: computed(() => !shootStore.isShootActive(shootItem.value?.metadata.uid)),
        ...createShootItemComposable(shootItem, {
          projectStore,
          cloudProfileStore,
          seedStore,
        }),
      })
    })

    it('should compute isShootMarkedForDeletion correctly', () => {
      setShootItem('metadata.annotations["confirmation.gardener.cloud/deletion"]', 'True')
      expect(reactiveShootItem.isShootMarkedForDeletion).toBe(false)

      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(reactiveShootItem.isShootMarkedForDeletion).toBe(true)

      setShootItem('metadata.annotations["confirmation.gardener.cloud/deletion"]', 'Foo')
      expect(reactiveShootItem.isShootMarkedForDeletion).toBe(false)
    })

    it('should compute isShootMarkedForForceDeletion correctly', () => {
      setShootItem('metadata.annotations["confirmation.gardener.cloud/force-deletion"]', 'True')
      expect(reactiveShootItem.isShootMarkedForForceDeletion).toBe(false)

      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(reactiveShootItem.isShootMarkedForForceDeletion).toBe(true)

      setShootItem('metadata.annotations["confirmation.gardener.cloud/force-deletion"]', 'Foo')
      expect(reactiveShootItem.isShootMarkedForForceDeletion).toBe(false)
    })

    it('should compute isShootReconciliationDeactivated correctly', () => {
      setShootItem('metadata.annotations["shoot.gardener.cloud/ignore"]', 'True')
      expect(reactiveShootItem.isShootReconciliationDeactivated).toBe(true)

      setShootItem('metadata.annotations["shoot.gardener.cloud/ignore"]', 'Foo')
      expect(reactiveShootItem.isShootReconciliationDeactivated).toBe(false)
    })

    it('should compute isShootStatusHibernationProgressing correctly', () => {
      setShootItem('spec.hibernation.enabled', true)
      expect(reactiveShootItem.isShootSettingHibernated).toBe(true)
      expect(reactiveShootItem.isShootStatusHibernationProgressing).toBe(true)

      setShootItem('status.hibernated', true)
      expect(reactiveShootItem.isShootSettingHibernated).toBe(true)
      expect(reactiveShootItem.isShootStatusHibernationProgressing).toBe(false)
    })

    it('should compute isCustomShootDomain correctly', () => {
      setShootItem('spec.dns.providers', [
        { primary: false },
      ])
      expect(reactiveShootItem.isCustomShootDomain).toBe(false)

      setShootItem('spec.dns.providers', [
        { primary: false },
        { primary: true },
      ])
      expect(reactiveShootItem.isCustomShootDomain).toBe(true)
    })

    it('should compute isShootLastOperationTypeDelete correctly', () => {
      setShootItem('status.lastOperation.type', 'Delete')
      expect(reactiveShootItem.isShootLastOperationTypeDelete).toBe(true)

      setShootItem('status.lastOperation.type', 'Foo')
      expect(reactiveShootItem.isShootLastOperationTypeDelete).toBe(false)
    })

    it('should compute isShootLastOperationTypeControlPlaneMigrating correctly', () => {
      setShootItem('status.lastOperation', {
        type: 'Migrate',
        state: 'Succeeded',
      })
      expect(reactiveShootItem.isShootLastOperationTypeControlPlaneMigrating).toBe(true)

      setShootItem('status.lastOperation.type', 'Foo')
      expect(reactiveShootItem.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      setShootItem('status.lastOperation.type', 'Restore')
      expect(reactiveShootItem.isShootLastOperationTypeControlPlaneMigrating).toBe(false)

      setShootItem('status.lastOperation.state', undefined)
      expect(reactiveShootItem.isShootLastOperationTypeControlPlaneMigrating).toBe(true)
    })

    it('should compute isHibernationPossible correctly', () => {
      setShootItem('status.constraints', [{
        type: 'HibernationPossible',
        status: 'False',
      }])
      expect(reactiveShootItem.isHibernationPossible).toBe(false)

      setShootItem('status.constraints', [{
        type: 'HibernationPossible',
        status: 'True',
      }])
      expect(reactiveShootItem.isHibernationPossible).toBe(true)

      setShootItem('status.constraints', [])
      expect(reactiveShootItem.isHibernationPossible).toBe(true)
    })

    it('should compute isMaintenancePreconditionSatisfied correctly', () => {
      setShootItem('status.constraints', [{
        type: 'MaintenancePreconditionsSatisfied',
        status: 'False',
      }])
      expect(reactiveShootItem.isMaintenancePreconditionSatisfied).toBe(false)

      setShootItem('status.constraints', [{
        type: 'MaintenancePreconditionsSatisfied',
        status: 'True',
      }])
      expect(reactiveShootItem.isMaintenancePreconditionSatisfied).toBe(true)

      setShootItem('status.constraints', [])
      expect(reactiveShootItem.isMaintenancePreconditionSatisfied).toBe(true)
    })

    it('should compute isCACertificateValiditiesAcceptable correctly', () => {
      setShootItem('status.constraints', [{
        type: 'CACertificateValiditiesAcceptable',
        status: 'False',
      }])
      expect(reactiveShootItem.isCACertificateValiditiesAcceptable).toBe(false)

      setShootItem('status.constraints', [{
        type: 'CACertificateValiditiesAcceptable',
        status: 'True',
      }])
      expect(reactiveShootItem.isCACertificateValiditiesAcceptable).toBe(true)

      setShootItem('status.constraints', [])
      expect(reactiveShootItem.isCACertificateValiditiesAcceptable).toBe(true)
    })

    it('should compute isStaleShoot correctly', () => {
      authzStore.setNamespace('_all')
      shootStore.state.shootListFilters = {
        onlyShootsWithIssues: true,
        progressing: true,
      }
      setShootItem('metadata.labels["shoot.gardener.cloud/status"]', 'progressing')
      expect(reactiveShootItem.isStaleShoot).toBe(true)

      setShootItem('metadata.labels["shoot.gardener.cloud/status"]', undefined)
      expect(reactiveShootItem.isStaleShoot).toBe(false)
    })

    it('should compute canForceDeleteShoot correctly', () => {
      setShootItem('metadata.deletionTimestamp', '2023-01-01T20:57:01Z')
      expect(reactiveShootItem.canForceDeleteShoot).toBe(false)

      setShootItem('status.lastErrors', [{
        codes: ['ERR_CLEANUP_CLUSTER_RESOURCES'],
      }])
      expect(reactiveShootItem.canForceDeleteShoot).toBe(true)

      setShootItem('metadata.deletionTimestamp', undefined)
      expect(reactiveShootItem.canForceDeleteShoot).toBe(false)
    })

    it('should compute shootCloudProviderBinding correctly', () => {
      credentialStore._setCredentials(fixtures.credentials)
      setShootItem('spec.credentialsBindingName', 'aws-credentialsbinding')
      expect(reactiveShootItem.shootCloudProviderBinding).toMatchSnapshot()

      setShootItem('spec.credentialsBindingName', undefined)
      setShootItem('spec.secretBindingName', 'aws-secretbinding')
      expect(reactiveShootItem.shootCloudProviderBinding).toMatchSnapshot()
    })
  })
})
