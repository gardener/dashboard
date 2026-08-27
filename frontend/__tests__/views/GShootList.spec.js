//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  flushPromises,
  shallowMount,
} from '@vue/test-utils'
import {
  createPinia,
  setActivePinia,
} from 'pinia'
import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'
import { useShootStore } from '@/store/shoot'

import GShootList from '@/views/GShootList.vue'

import GShootListToolbar from '@/components/GShootListToolbar.vue'

import { useShootListFilters } from '@/composables/useShootListFilters'

import {
  getShootListContext,
  normalizeShootListRoute,
} from '@/router/shootList'

// Disable createSharedComposable so each test gets a fresh composable instance
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

vi.mock('@/components/GDataTableFooter.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/GShootListActions.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/GShootListProgress.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/GShootListRow.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/GTableColumnSelection.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/GTableSearch.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/composables/useProjectShootCustomFields', async () => {
  const { ref } = await import('vue')
  return {
    useProjectShootCustomFields: () => ({
      shootCustomFields: ref([]),
    }),
  }
})

vi.mock('@/composables/useProjectShootCustomFields/helper', () => ({
  isCustomField: () => false,
}))

vi.mock('@/composables/useShootAction', () => ({
  useProvideShootAction: () => {},
}))

const DEFAULT_SEARCH = 'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false'
const { createVuetifyPlugin } = global.fixtures.helper

const VBtnStub = {
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

const VMenuStub = {
  name: 'VMenu',
  props: {
    modelValue: Boolean,
    activatorProps: Object,
    contentProps: Object,
  },
  emits: ['update:modelValue'],
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
}

describe('views', () => {
  describe('g-shoot-list', () => {
    let authzStore
    let canViewLandscapeSpy
    let localStorageStore
    let pinia
    let router
    let shootStore
    let wrapper
    let initialQuery

    function setConfiguredFilters (filters = {}) {
      localStorageStore.allProjectsShootFilter = {
        healthy: true,
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
        ...filters,
      }
    }

    async function mountComponent () {
      const target = {
        name: 'ShootList',
        params: {
          namespace: authzStore.namespace,
        },
        query: initialQuery,
      }
      const route = router.resolve(target)
      const { shootListFilters } = useShootListFilters()
      const normalizedTarget = normalizeShootListRoute(route, shootListFilters.value)
      await router.replace(normalizedTarget ?? target)

      wrapper = shallowMount(GShootList, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
            router,
          ],
          directives: {
            tooltip: () => {},
          },
          stubs: {
            GShootListToolbar: false,
            VBtn: VBtnStub,
            VCard: {
              template: '<div><slot /></div>',
            },
            VChip: {
              template: '<span><slot /></span>',
            },
            VContainer: {
              template: '<div><slot /></div>',
            },
            VSheet: {
              template: '<div><slot /></div>',
            },
            VTooltip: {
              template: '<div><slot name="activator" :props="{}" /><slot /></div>',
            },
            VMenu: VMenuStub,
            VList: {
              template: '<div><slot /></div>',
            },
            VListSubheader: {
              template: '<div><slot /></div>',
            },
            VListItem: {
              inheritAttrs: false,
              props: {
                to: Object,
              },
              emits: ['click'],
              template: '<div v-bind="$attrs" @click="$emit(\'click\')"><slot /><slot name="prepend" /><slot name="append" /></div>',
            },
            VListItemTitle: {
              template: '<span><slot /></span>',
            },
            VListItemSubtitle: {
              template: '<span><slot /></span>',
            },
            VDivider: {
              template: '<hr />',
            },
            VIcon: {
              template: '<i />',
            },
          },
        },
      })
      return wrapper
    }

    function getOperationsView () {
      return wrapper.findComponent(GShootListToolbar).vm.operationsView
    }

    function getRouteSearch () {
      return router.resolve(router.options.history.location).query.q
    }

    function getCommittedRouteSearch () {
      return router.currentRoute.value.query.q
    }

    async function settleSearchUpdate () {
      await nextTick()
      await flushPromises()
      await nextTick()
    }

    beforeEach(() => {
      vi.useFakeTimers()
      window.localStorage.clear()

      pinia = createPinia()
      setActivePinia(pinia)
      authzStore = useAuthzStore()
      canViewLandscapeSpy = vi.spyOn(authzStore, 'canViewLandscape', 'get').mockReturnValue(true)
      useConfigStore().setConfiguration({
        ticket: {
          gitHubRepoUrl: 'https://github.com/org/repo',
          hideClustersWithLabels: ['ignore'],
        },
      })
      localStorageStore = useLocalStorageStore()
      shootStore = useShootStore()
      vi.spyOn(shootStore, 'subscribeShoots').mockResolvedValue()
      authzStore._setNamespace('_all')
      setConfiguredFilters()
      localStorageStore.allProjectsShootDefaultView = 'operations'
      initialQuery = {}

      router = createRouter({
        history: createMemoryHistory(),
        routes: [{
          name: 'ShootList',
          path: '/namespace/:namespace/shoots',
          component: {},
        }],
      })
      router.afterEach(to => {
        if (to.name === 'ShootList') {
          shootStore.activateShootList(getShootListContext(to))
        }
      })
    })

    afterEach(() => {
      wrapper?.unmount()
      canViewLandscapeSpy.mockRestore()
      vi.useRealTimers()
    })

    it('applies the configured default when q is absent', async () => {
      await mountComponent()

      expect(wrapper.vm.shootSearch).toBe(DEFAULT_SEARCH)
      expect(wrapper.vm.debouncedShootSearch).toBe(DEFAULT_SEARCH)
      expect(getRouteSearch()).toBe(DEFAULT_SEARCH)
      expect(shootStore.shootSearchQuery.terms).toHaveLength(4)
      expect(getOperationsView().state).toBe('active')
      const activator = wrapper.find('[data-test="operations-view-activator"]')
      expect(activator.text()).toContain('Operations View')
      expect(activator.attributes('aria-label')).toBe('Operations View is active')
      expect(activator.attributes('variant')).toBe('tonal')
      expect(getOperationsView().activatorIcon).toBe('mdi-filter-check-outline')
      expect(wrapper.find('[data-test="operations-view-status"]').text()).toBe('Active')
      const menu = wrapper.findComponent(VMenuStub)
      expect(menu.props('activatorProps')).toEqual({ 'aria-haspopup': 'dialog' })
      expect(menu.props('contentProps')).toEqual({
        role: 'dialog',
        'aria-labelledby': 'operations-view-menu-title',
        'aria-describedby': 'operations-view-menu-description operations-view-menu-status',
      })
      expect(wrapper.find('[data-test="operations-view-menu-list"]').attributes('tabindex')).toBe('-1')
      expect(wrapper.find('[data-test="operations-view-show-all"]').exists()).toBe(true)
      const showAllItem = wrapper.find('[data-test="operations-view-show-all"]')
      expect(showAllItem.attributes('role')).toBe('button')
      expect(showAllItem.attributes('tabindex')).toBe('0')
      expect(showAllItem.text()).toContain('Clears every term in the current search.')
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Shows unhealthy clusters that may need attention')

      const defaultClusterViewItem = wrapper.findComponent('[data-test="operations-view-default-cluster-view"]')
      expect(defaultClusterViewItem.text()).toContain('Default cluster view')
      expect(defaultClusterViewItem.text()).toContain('Operations View')
      expect(wrapper.find('[data-test="operations-view-default-cluster-view-value"]').text()).toBe('Operations View')
      expect(defaultClusterViewItem.attributes('tabindex')).toBe('0')
      expect(defaultClusterViewItem.props('to')).toEqual({
        name: 'Settings',
        query: { namespace: '_all' },
        hash: '#setting=default-cluster-view',
      })

      const exclusionCriteriaItem = wrapper.findComponent('[data-test="operations-view-exclusion-criteria"]')
      expect(exclusionCriteriaItem.text()).toContain('Edit exclusion criteria…')
      expect(exclusionCriteriaItem.attributes('tabindex')).toBe('0')
      expect(exclusionCriteriaItem.props('to')).toEqual({
        name: 'Settings',
        query: { namespace: '_all' },
        hash: '#setting=cluster-operations',
      })
      expect(wrapper.text()).toContain('Settings')
    })

    it('keeps an explicit non-empty query independent of local defaults', async () => {
      initialQuery = {
        q: 'provider:aws',
      }
      await mountComponent()

      setConfiguredFilters({
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      await nextTick()

      expect(wrapper.vm.shootSearch).toBe('provider:aws')
      expect(getRouteSearch()).toBe('provider:aws')
      expect(shootStore.shootSearchQuery.terms).toEqual([{
        field: 'provider',
        value: 'aws',
        exact: false,
        exclude: false,
      }])
      expect(getOperationsView().state).toBe('custom')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('aria-label')).toBe('Operations View — custom search')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('variant')).toBe('text')
      expect(getOperationsView().activatorIcon).toBe('mdi-filter-cog-outline')
      expect(wrapper.find('[data-test="operations-view-status"]').text()).toBe('Custom search')
      expect(wrapper.find('[data-test="operations-view-show-all"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').attributes('role')).toBe('button')
      expect(wrapper.find('[data-test="operations-view-apply"]').attributes('tabindex')).toBe('0')
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Replaces every term in the current search with the Operations View criteria.')
      expect(wrapper.find('[data-test="operations-view-default-cluster-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-default-cluster-view-value"]').text()).toBe('Operations View')
      expect(wrapper.find('[data-test="operations-view-exclusion-criteria"]').exists()).toBe(true)
    })

    it('applies the all-clusters default without changing Operations View criteria', async () => {
      localStorageStore.allProjectsShootDefaultView = 'all'
      await mountComponent()

      expect(wrapper.vm.shootSearch).toBe('')
      expect(wrapper.vm.debouncedShootSearch).toBe('')
      expect(getRouteSearch()).toBe('')
      expect(shootStore.shootSearchQuery.terms).toEqual([])
      expect(getOperationsView().state).toBe('all')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('aria-label')).toBe('Operations View — showing all clusters')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('variant')).toBe('text')
      expect(getOperationsView().activatorIcon).toBe('mdi-filter-off-outline')
      expect(wrapper.find('[data-test="operations-view-status"]').text()).toBe('All clusters')
      expect(wrapper.find('[data-test="operations-view-show-all"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-default-cluster-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-default-cluster-view-value"]').text()).toBe('All clusters')
      expect(wrapper.find('[data-test="operations-view-exclusion-criteria"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Apply Operations View')
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Uses the Operations View criteria to show clusters that may need attention.')
    })

    it('uses the shared Operations View terminology for regular users', async () => {
      canViewLandscapeSpy.mockReturnValue(false)
      setConfiguredFilters({
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      initialQuery = {
        q: 'provider:aws',
      }
      await mountComponent()

      expect(wrapper.text()).toContain('Shows unhealthy clusters that may need attention')

      const defaultClusterViewItem = wrapper.find('[data-test="operations-view-default-cluster-view"]')
      expect(defaultClusterViewItem.text()).toContain('Default cluster view')
      expect(defaultClusterViewItem.text()).toContain('Operations View')

      expect(wrapper.find('[data-test="operations-view-exclusion-criteria"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Apply Operations View')
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Replaces every term in the current search with the Operations View criteria.')

      await wrapper.find('[data-test="operations-view-apply"]').trigger('click')
      await settleSearchUpdate()

      expect(wrapper.vm.shootSearch).toBe('health:unhealthy')
      expect(getRouteSearch()).toBe('health:unhealthy')
      expect(getOperationsView().state).toBe('active')
    })

    it('keeps an explicitly empty query without reapplying the local default', async () => {
      initialQuery = {
        q: '',
      }
      await mountComponent()

      expect(wrapper.vm.shootSearch).toBe('')
      expect(getRouteSearch()).toBe('')
      expect(shootStore.shootSearchQuery.terms).toEqual([])
      expect(getOperationsView().state).toBe('all')
    })

    it('shows all clusters by clearing the complete current search', async () => {
      await mountComponent()
      const configuredFilters = { ...localStorageStore.allProjectsShootFilter }

      await wrapper.find('[data-test="operations-view-show-all"]').trigger('click')
      await settleSearchUpdate()

      expect(wrapper.vm.shootSearch).toBe('')
      expect(wrapper.vm.debouncedShootSearch).toBe('')
      expect(getRouteSearch()).toBe('')
      expect(getCommittedRouteSearch()).toBe(DEFAULT_SEARCH)
      expect(shootStore.shootSearchQuery.terms).toEqual([])
      expect(getOperationsView().state).toBe('all')
      expect(localStorageStore.allProjectsShootDefaultView).toBe('operations')
      expect(localStorageStore.allProjectsShootFilter).toEqual(configuredFilters)
    })

    it('applies the latest Operations View criteria to the complete query', async () => {
      initialQuery = {
        q: 'provider:aws',
      }
      await mountComponent()

      setConfiguredFilters({
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      await nextTick()

      await wrapper.find('[data-test="operations-view-apply"]').trigger('click')
      await settleSearchUpdate()

      expect(wrapper.vm.shootSearch).toBe('health:unhealthy')
      expect(wrapper.vm.debouncedShootSearch).toBe('health:unhealthy')
      expect(getRouteSearch()).toBe('health:unhealthy')
      expect(shootStore.shootSearchQuery.terms).toEqual([{
        field: 'health',
        value: 'unhealthy',
        exact: false,
        exclude: false,
      }])
      expect(getOperationsView().state).toBe('active')
    })

    it('applies Operations View independently of the saved default', async () => {
      initialQuery = {
        q: 'provider:aws',
      }
      localStorageStore.allProjectsShootDefaultView = 'all'
      await mountComponent()

      await wrapper.find('[data-test="operations-view-apply"]').trigger('click')
      await settleSearchUpdate()

      expect(wrapper.vm.shootSearch).toBe(DEFAULT_SEARCH)
      expect(wrapper.vm.debouncedShootSearch).toBe(DEFAULT_SEARCH)
      expect(getRouteSearch()).toBe(DEFAULT_SEARCH)
      expect(shootStore.shootSearchQuery.terms).toHaveLength(4)
      expect(getOperationsView().state).toBe('active')
      expect(localStorageStore.allProjectsShootDefaultView).toBe('all')
    })

    it('recognizes a reordered Operations expression as active', async () => {
      initialQuery = {
        q: 'progressing:false health:unhealthy operatorAction:true allTicketsIgnored:false',
      }
      await mountComponent()

      expect(getOperationsView().state).toBe('active')
      expect(wrapper.find('[data-test="operations-view-status"]').text()).toBe('Active')
      expect(wrapper.find('[data-test="operations-view-show-all"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(false)
    })

    it('recognizes Operations View with additional filters and offers apply', async () => {
      initialQuery = {
        q: 'seed:"infra1-seed" progressing:false health:unhealthy operatorAction:true allTicketsIgnored:false',
      }
      await mountComponent()

      expect(getOperationsView().state).toBe('refined')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('aria-label')).toBe('Operations View with additional filters')
      expect(wrapper.find('[data-test="operations-view-activator"]').attributes('variant')).toBe('tonal')
      expect(getOperationsView().activatorIcon).toBe('mdi-filter-plus-outline')
      expect(wrapper.find('[data-test="operations-view-status"]').text()).toBe('Additional filters')
      expect(wrapper.find('[data-test="operations-view-show-all"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Reset to Operations View')
      expect(wrapper.find('[data-test="operations-view-apply"]').text()).toContain('Removes every additional term from the current search.')

      await wrapper.find('[data-test="operations-view-apply"]').trigger('click')
      await settleSearchUpdate()

      expect(wrapper.vm.shootSearch).toBe(DEFAULT_SEARCH)
      expect(getOperationsView().state).toBe('active')
    })

    it('reports the current search as refined when Operations View criteria are relaxed', async () => {
      await mountComponent()

      setConfiguredFilters({
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      await nextTick()

      expect(wrapper.vm.shootSearch).toBe(DEFAULT_SEARCH)
      expect(getRouteSearch()).toBe(DEFAULT_SEARCH)
      expect(getOperationsView().state).toBe('refined')
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(true)
    })

    it('reports the current search as custom when required Operations View criteria are missing', async () => {
      setConfiguredFilters({
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      await mountComponent()

      setConfiguredFilters()
      await nextTick()

      expect(wrapper.vm.shootSearch).toBe('health:unhealthy')
      expect(getRouteSearch()).toBe('health:unhealthy')
      expect(getOperationsView().state).toBe('custom')
      expect(wrapper.find('[data-test="operations-view-apply"]').exists()).toBe(true)
    })

    it('does not show the Operations View menu for a project-scoped list', async () => {
      authzStore._setNamespace('garden-local')
      initialQuery = {
        q: '',
      }
      await mountComponent()

      expect(wrapper.find('[data-test="operations-view-activator"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="operations-view-default-cluster-view"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="operations-view-exclusion-criteria"]').exists()).toBe(false)
    })
  })
})
