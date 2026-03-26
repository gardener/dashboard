//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'

import GStatusTag from '@/components/GStatusTag.vue'

import { useApi } from '@/composables/useApi'

const { createVuetifyPlugin } = global.fixtures.helper

function createRulesResponse (resourceRules = []) {
  return {
    data: {
      resourceRules,
    },
  }
}

describe('components', () => {
  describe('g-status-tag', () => {
    const vuetifyPlugin = createVuetifyPlugin()
    const api = useApi()

    let pinia
    let authnStore
    let authzStore
    let mockGetSubjectRules

    function mountStatusTag (condition) {
      return mount(GStatusTag, {
        global: {
          plugins: [
            vuetifyPlugin,
            pinia,
          ],
        },
        props: {
          condition,
        },
      })
    }

    async function grantLandscapeAccess () {
      authnStore.user = { canListShootsAllNamespaces: true }
      const clusterRules = [{
        apiGroups: ['core.gardener.cloud'],
        resources: ['seeds'],
        verbs: ['list'],
      }]
      mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(clusterRules))
      await authzStore.fetchRules()
    }

    beforeEach(() => {
      pinia = createPinia()
      authnStore = useAuthnStore(pinia)
      authzStore = useAuthzStore(pinia)
      mockGetSubjectRules = vi.spyOn(api, 'getSubjectRules')
      mockGetSubjectRules.mockResolvedValue(createRulesResponse())
    })

    it('should render healthy condition object', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'True',
      })
      const vm = wrapper.vm
      expect(vm.chipText).toBe('foo')
      expect(vm.chipStatus).toBe('Healthy')
      expect(vm.chipTooltip.title).toBe('foo-bar')
      expect(vm.chipIcon).toBe('')
      expect(vm.isError || vm.isUnknown || vm.isProgressing).toBe(false)
      expect(vm.color).toBe('success')
      expect(vm.visible).toBe(true)
    })

    it('should render condition with user error', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'True',
        codes: [
          'ERR_CONFIGURATION_PROBLEM',
        ],
      })
      const vm = wrapper.vm
      expect(vm.chipText).toBe('foo')
      expect(vm.chipStatus).toBe('Error')
      expect(vm.isError).toBe(true)
      expect(vm.isUserError).toBe(true)
      expect(vm.chipIcon).toBe('mdi-account-alert-outline')
      expect(vm.color).toBe('error')
      expect(vm.visible).toBe(true)
    })

    it('should hide landscape-viewer-only condition without landscape access', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'Progressing',
        showLandscapeViewerOnly: true,
      })
      const vm = wrapper.vm
      expect(vm.visible).toBe(false)
      expect(vm.isProgressing).toBe(true)
      expect(vm.color).toBe('success')
      expect(vm.chipStatus).toBe('Progressing')
      expect(vm.chipIcon).toBe('')
    })

    it('should render landscape-viewer-only condition with landscape access', async () => {
      await grantLandscapeAccess()
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'Progressing',
        showLandscapeViewerOnly: true,
      })
      const vm = wrapper.vm
      expect(vm.visible).toBe(true)
      expect(vm.isProgressing).toBe(true)
      expect(vm.color).toBe('info')
      expect(vm.chipStatus).toBe('Progressing')
      expect(vm.chipIcon).toBe('mdi-progress-alert')
    })
  })
})
