//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
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

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import GSettings from '@/views/GSettings.vue'

const {
  replaceRoute,
  route,
} = vi.hoisted(() => ({
  replaceRoute: vi.fn(),
  route: {
    hash: '',
    query: {},
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    replace: replaceRoute,
  }),
}))

// Disable createSharedComposable so each test gets a fresh composable instance
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

const { createVuetifyPlugin } = global.fixtures.helper

const SlotStub = {
  template: '<div><slot /><slot name="prepend" /><slot name="append" /><slot name="description" /></div>',
}

const GListItemContentStub = {
  props: {
    label: String,
    description: String,
  },
  template: '<div>{{ label }} {{ description }}<slot /><slot name="description" /></div>',
}

const VDialogStub = {
  name: 'VDialog',
  props: {
    modelValue: Boolean,
    persistent: Boolean,
  },
  emits: [
    'update:modelValue',
    'afterEnter',
    'afterLeave',
  ],
  template: '<div data-test="operations-view-dialog"><slot /></div>',
}

describe('views', () => {
  describe('g-settings', () => {
    let authzStore
    let canViewLandscapeSpy
    let configStore
    let localStorageStore
    let pinia
    let wrapper

    function mountComponent () {
      const url = new URL(window.location.href)
      route.hash = url.hash
      route.query = Object.fromEntries(url.searchParams)
      wrapper = shallowMount(GSettings, {
        attachTo: document.body,
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
          directives: {
            tooltip: () => {},
          },
          stubs: {
            GList: SlotStub,
            GListItem: SlotStub,
            GListItemContent: GListItemContentStub,
            GToolbar: SlotStub,
            VCard: SlotStub,
            VCardActions: SlotStub,
            VCardText: SlotStub,
            VCol: SlotStub,
            VContainer: SlotStub,
            VDialog: VDialogStub,
            VExpandTransition: SlotStub,
            VRow: SlotStub,
          },
        },
      })
    }

    beforeEach(() => {
      window.localStorage.clear()
      window.history.replaceState({}, '', '/')
      route.hash = ''
      route.query = {}
      replaceRoute.mockReset()
      replaceRoute.mockImplementation(async location => {
        const { hash, query } = location
        route.hash = hash
        const url = new URL(window.location.href)
        url.hash = hash
        if ('query' in location) {
          route.query = query ?? {}
          url.search = new URLSearchParams(route.query).toString()
        } else {
          route.query = {}
          url.search = ''
        }
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      })

      pinia = createPinia()
      setActivePinia(pinia)
      authzStore = useAuthzStore()
      canViewLandscapeSpy = vi.spyOn(authzStore, 'canViewLandscape', 'get').mockReturnValue(false)
      configStore = useConfigStore()
      configStore.setConfiguration({})
      localStorageStore = useLocalStorageStore()
      localStorageStore.allProjectsShootFilter = {
        progressing: true,
        operatorAction: false,
        allTicketsIgnored: true,
      }
      localStorageStore.allProjectsShootDefaultView = 'operations'
    })

    afterEach(() => {
      wrapper?.unmount()
      canViewLandscapeSpy.mockRestore()
    })

    it('shows Cluster List settings without Operations View configuration controls for regular users', () => {
      mountComponent()

      const clusterListTitle = wrapper.find('[data-test="cluster-list-settings-title"]')
      const operationsViewItem = wrapper.find('.operations-view')
      expect(clusterListTitle.attributes('title')).toBe('Cluster List')
      expect(operationsViewItem.text()).toContain('Operations View')
      expect(operationsViewItem.find('[data-test="operations-view-description"]').text()).toBe(
        'Shows unhealthy clusters that may need attention.',
      )
      expect(operationsViewItem.text()).not.toContain('Current settings')
      expect(operationsViewItem.find('[aria-label="Configure exclusion criteria"]').exists()).toBe(false)
      expect(wrapper.findComponent(VDialogStub).exists()).toBe(false)

      expect(wrapper.text()).toContain('Default Cluster View')
      expect(wrapper.text()).toContain('Choose whether the All Projects cluster list opens with all clusters or Operations View')
      expect(wrapper.text()).not.toContain('determines which unhealthy Shoots are counted for each Seed')
    })

    it('ignores exclusion-criteria deep links for regular users', async () => {
      window.history.replaceState({}, '', '/#setting=cluster-operations')

      mountComponent()
      await flushPromises()

      expect(wrapper.findComponent(VDialogStub).exists()).toBe(false)
      const operationsViewItem = wrapper.find('.operations-view')
      expect(operationsViewItem.classes()).not.toContain('operations-view--highlighted')
      expect(document.activeElement).not.toBe(operationsViewItem.element)
      expect(replaceRoute).toHaveBeenCalledWith({ query: {}, hash: '' })
      expect(window.location.hash).toBe('')
    })

    it('highlights the deep-linked default cluster view until the user interacts', async () => {
      window.history.replaceState({}, '', '/?namespace=_all#setting=default-cluster-view')

      mountComponent()
      await flushPromises()

      const defaultClusterViewItem = wrapper.find('.default-view')
      expect(defaultClusterViewItem.classes()).toContain('default-view--highlighted')
      expect(document.activeElement).toBe(defaultClusterViewItem.element)
      expect(replaceRoute).toHaveBeenCalledWith({ query: { namespace: '_all' }, hash: '' })
      expect(window.location.hash).toBe('')
      expect(window.location.search).toBe('?namespace=_all')

      await defaultClusterViewItem.trigger('keydown')

      expect(defaultClusterViewItem.classes()).not.toContain('default-view--highlighted')
    })

    it('keeps the default cluster view in the Cluster List card and outside the dialog', () => {
      canViewLandscapeSpy.mockReturnValue(true)
      mountComponent()

      const clusterListCard = wrapper.find('.cluster-list-card')
      const defaultClusterViewItem = clusterListCard.find('.default-view')
      const dialog = wrapper.find('[data-test="operations-view-dialog"]')

      expect(clusterListCard.find('[data-test="cluster-list-settings-title"]').attributes('title')).toBe('Cluster List')
      expect(defaultClusterViewItem.text()).toContain('Default Cluster View')
      expect(defaultClusterViewItem.text()).toContain('Choose whether the All Projects cluster list opens with all clusters or Operations View')
      expect(defaultClusterViewItem.find('[aria-label="Default cluster view"]').exists()).toBe(true)
      expect(dialog.text()).not.toContain('Default Cluster View')
      expect(dialog.text()).not.toContain('Choose whether the All Projects cluster list opens with all clusters or Operations View')
    })

    it('only closes the persistent Operations View dialog with its OK button', async () => {
      canViewLandscapeSpy.mockReturnValue(true)
      mountComponent()

      const dialog = wrapper.findComponent(VDialogStub)
      expect(dialog.props('persistent')).toBe(true)
      expect(wrapper.find('[aria-label="Close"]').exists()).toBe(false)

      await wrapper.find('[aria-label="Configure exclusion criteria"]').trigger('click')
      expect(dialog.props('modelValue')).toBe(true)

      const dialogTitle = wrapper.find('#cluster-operations-dialog-title')
      expect(dialogTitle.attributes('tabindex')).toBeUndefined()
      dialog.vm.$emit('afterEnter')
      await nextTick()
      expect(document.activeElement).not.toBe(dialogTitle.element)

      const okButton = wrapper.find('[aria-label="OK"]')
      expect(okButton.exists()).toBe(true)

      await okButton.trigger('click')
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('opens a deep-linked Operations View dialog and highlights its entry after closing for landscape viewers', async () => {
      canViewLandscapeSpy.mockReturnValue(true)
      window.history.replaceState({}, '', '/?namespace=_all#setting=cluster-operations')

      mountComponent()

      const dialog = wrapper.findComponent(VDialogStub)
      expect(dialog.props('modelValue')).toBe(true)
      expect(replaceRoute).not.toHaveBeenCalled()
      expect(window.location.search).toBe('?namespace=_all')

      await wrapper.find('[aria-label="OK"]').trigger('click')
      dialog.vm.$emit('afterLeave')
      await flushPromises()

      const operationsViewItem = wrapper.find('.operations-view')
      expect(operationsViewItem.classes()).toContain('operations-view--highlighted')
      expect(replaceRoute).toHaveBeenCalledWith({ query: { namespace: '_all' }, hash: '' })
      expect(window.location.hash).toBe('')
      expect(window.location.search).toBe('?namespace=_all')
    })

    it('places the Operations View description before the exclusion criteria', () => {
      canViewLandscapeSpy.mockReturnValue(true)
      mountComponent()

      const dialogText = wrapper.find('[data-test="operations-view-dialog"]').text()
      expect(dialogText.indexOf('Operations View shows clusters that may need attention')).toBeLessThan(dialogText.indexOf('Exclusion criteria'))

      const exclusionCriteria = wrapper.find('#cluster-operations-exclusion-title').element.parentElement
      expect(exclusionCriteria.textContent).not.toContain('Operations View shows clusters that may need attention')
    })

    it('shows the configured criteria inline and lets landscape viewers change them', async () => {
      canViewLandscapeSpy.mockReturnValue(true)
      localStorageStore.allProjectsShootDefaultView = 'all'
      mountComponent()

      const operationsViewItem = wrapper.find('.operations-view')
      const operationsViewDescription = operationsViewItem.find('[data-test="operations-view-description"]')

      expect(operationsViewDescription.text()).toBe(
        'Shows unhealthy clusters that may need attention, excluding those that are progressing.',
      )
      expect(operationsViewItem.find('[aria-label="Configure exclusion criteria"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Exclusion criteria')
      expect(wrapper.text()).toContain('Operations View shows clusters that may need attention')
      expect(wrapper.text()).toContain('Choose which clusters to hide')
      expect(wrapper.text()).toContain('Always excluded')
      expect(wrapper.text()).toContain('Choose whether the All Projects cluster list opens with all clusters or Operations View')
      expect(wrapper.text()).toContain('This also determines which unhealthy Shoots are counted for each Seed')
      expect(wrapper.find('[aria-label="Hide progressing clusters"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Hide clusters without operator action needed"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Hide clusters with only ignored tickets"]').exists()).toBe(false)

      wrapper.findComponent('[aria-label="Hide clusters without operator action needed"]')
        .vm.$emit('update:modelValue', true)
      await nextTick()

      expect(operationsViewDescription.text()).toBe(
        'Shows unhealthy clusters that may need attention, excluding those that are progressing or do not require operator action.',
      )
    })

    it('shows the ignored-ticket criterion only when ticket filtering is available', () => {
      canViewLandscapeSpy.mockReturnValue(true)
      configStore.setConfiguration({
        ticket: {
          gitHubRepoUrl: 'https://github.com/gardener/tickets',
          hideClustersWithLabels: ['ignored'],
        },
      })
      mountComponent()

      expect(wrapper.find('[data-test="operations-view-description"]').text()).toBe(
        'Shows unhealthy clusters that may need attention, excluding those that are progressing or have only ignored tickets.',
      )
      expect(wrapper.find('[aria-label="Hide clusters with only ignored tickets"]').exists()).toBe(true)
    })

    it('changes the default without erasing Operations View criteria', async () => {
      mountComponent()

      const criteria = { ...localStorageStore.allProjectsShootFilter }
      const defaultViewToggle = wrapper
        .findAllComponents({ name: 'VBtnToggle' })
        .find(component => component.attributes('aria-label') === 'Default cluster view')

      expect(defaultViewToggle.props('modelValue')).toBe('operations')

      defaultViewToggle.vm.$emit('update:modelValue', 'all')
      await nextTick()

      expect(localStorageStore.allProjectsShootDefaultView).toBe('all')
      expect(localStorageStore.allProjectsShootFilter).toEqual(criteria)
      expect(defaultViewToggle.props('modelValue')).toBe('all')
    })
  })
})
