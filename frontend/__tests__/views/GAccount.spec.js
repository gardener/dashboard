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

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'

import GAccount from '@/views/GAccount.vue'

import { notify as notifyPlugin } from '@/plugins'

const { createVuetifyPlugin } = global.fixtures.helper

const SlotStub = {
  template: '<div><slot /><slot name="prepend" /><slot name="append" /></div>',
}

describe('views', () => {
  describe('g-account', () => {
    let api
    let appStore
    let authnStore
    let pinia
    let wrapper

    const groups = ['group-a', 'group-b']

    function mountComponent () {
      wrapper = shallowMount(GAccount, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            notifyPlugin,
            pinia,
          ],
          provide: {
            api,
            logger: {
              debug: vi.fn(),
              error: vi.fn(),
              info: vi.fn(),
              warn: vi.fn(),
            },
          },
          stubs: {
            GAccountAvatar: true,
            GList: SlotStub,
            GListItem: SlotStub,
            GTimeString: true,
            GToolbar: true,
            VCard: SlotStub,
            VChip: {
              template: '<span class="v-chip"><slot /></span>',
            },
            VCol: SlotStub,
            VContainer: SlotStub,
            VRow: SlotStub,
          },
        },
      })
    }

    beforeEach(() => {
      api = {
        getUserGroups: vi.fn(),
      }
      pinia = createPinia()
      setActivePinia(pinia)
      useConfigStore().setConfiguration({})
      authnStore = useAuthnStore()
      authnStore.user = {
        id: 'foo@example.org',
        email: 'foo@example.org',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      appStore = useAppStore()
      vi.spyOn(appStore, 'setError')
    })

    afterEach(() => {
      wrapper?.unmount()
    })

    it('should keep account identity independent of cookie groups', () => {
      expect(Object.hasOwn(authnStore.user, 'groups')).toBe(false)
    })

    it('should show a loading indicator until groups resolve', async () => {
      let resolveGroups
      api.getUserGroups.mockReturnValue(new Promise(resolve => {
        resolveGroups = resolve
      }))

      mountComponent()
      await nextTick()

      expect(api.getUserGroups).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[data-test="groups-loading"]').exists()).toBe(true)
      expect(wrapper.findAll('.v-chip')).toHaveLength(0)

      resolveGroups({ data: groups })
      await flushPromises()

      expect(wrapper.find('[data-test="groups-loading"]').exists()).toBe(false)
      expect(wrapper.findAll('.v-chip')).toHaveLength(2)
      expect(wrapper.findAll('.v-chip').map(chip => chip.text())).toEqual(groups)
    })

    it('should render no chips and report the error when the request fails', async () => {
      const error = Object.assign(new Error('Request failed with status code 500'), {
        response: {
          status: 500,
          data: { message: 'TokenReview failed' },
        },
      })
      api.getUserGroups.mockRejectedValue(error)

      mountComponent()
      await flushPromises()

      expect(api.getUserGroups).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[data-test="groups-loading"]').exists()).toBe(false)
      expect(wrapper.findAll('.v-chip')).toHaveLength(0)
      expect(appStore.setError).toHaveBeenCalledTimes(1)
      expect(appStore.setError).toHaveBeenCalledWith(error)
    })
  })
})
