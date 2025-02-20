//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'

import GLogin from '@/layouts/GLogin.vue'

import {
  components as componentsPlugin,
  utils as utilsPlugin,
  notify as notifyPlugin,
} from '@/plugins'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-login', () => {
    const noop = () => {}

    let pinia
    let appStore
    let authnStore
    let loginStore // eslint-disable-line no-unused-vars
    let localStorageStore
    let mockRoute
    let mockRouter
    let mockNext

    function mountLogin () {
      return mount(GLogin, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            componentsPlugin,
            utilsPlugin,
            notifyPlugin,
            pinia,
          ],
          mocks: {
            $route: mockRoute,
            $router: mockRouter,
          },
        },
      })
    }

    beforeEach(() => {
      fetch.mockResponse(JSON.stringify({
        loginTypes: ['oidc', 'token'],
        landingPageUrl: 'https://gardener.cloud/',
        themes: {
          light: {
            primary: '#2196F3',
          },
          dark: {
            primary: '#F39621',
          },
        },
      }))
      mockRoute = {
        query: {
          redirectPath: '/namespace/garden/shoots',
        },
      }
      mockRouter = {
        push: vi.fn(),
        replace: vi.fn(),
      }
      pinia = createTestingPinia({
        stubActions: false,
        initialState: {
          authn: {
            user: {
              email: 'john.doe@example.org',
              isAdmin: true,
            },
          },
        },
      })
      setActivePinia(pinia)
      appStore = useAppStore()
      authnStore = useAuthnStore()
      authnStore.signinWithOidc.mockImplementation(noop)
      loginStore = useLoginStore()
      localStorageStore = useLocalStorageStore()
    })

    it('should render the login page', async () => {
      const wrapper = mountLogin()
      await nextTick()

      expect(wrapper.find('div.text-h5.text-primary').text()).toBe('Universal Kubernetes at Scale')
    })

    describe('#beforeRouteEnter', () => {
      let error

      beforeEach(() => {
        error = Object.assign(new Error('error'), {
          title: 'title',
        })
      })

      it('should show a login error', async () => {
        const wrapper = mountLogin()
        const to = {
          hash: '#' + new URLSearchParams({
            error: error.message,
            title: error.title,
          }),
        }
        mockNext = vi.fn().mockImplementation(fn => {
          if (typeof fn === 'function') {
            fn(wrapper.vm)
          }
        })
        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined, mockNext)
        expect(wrapper.vm.error.message).toBe(error.message)
        await GLogin.beforeRouteUpdate.call(wrapper.vm, undefined, undefined, () => {})
        expect(mockNext).toBeCalledTimes(1)
        expect(mockNext.mock.calls[0]).toEqual([expect.any(Function)])
        expect(appStore.setError).toBeCalledTimes(1)
        expect(appStore.setError.mock.calls[0]).toEqual([
          expect.objectContaining({
            message: 'error',
            title: 'title',
          }),
        ])
        expect(mockRouter.replace).toBeCalledTimes(1)
        expect(mockRouter.replace.mock.calls[0]).toEqual(['/login'])
      })

      it('should not show a login error', async () => {
        error.message = 'NoAutoLogin'
        const wrapper = mountLogin()
        const to = {
          hash: '#' + new URLSearchParams({
            error: error.message,
            title: error.title,
          }),
        }
        mockNext = vi.fn().mockImplementation(fn => {
          if (typeof fn === 'function') {
            fn(wrapper.vm)
          }
        })
        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined, mockNext)
        expect(mockNext).toBeCalledTimes(1)
        expect(mockNext.mock.calls[0]).toEqual([expect.any(Function)])
        expect(appStore.setError).not.toBeCalled()
        expect(mockRouter.replace).toBeCalledTimes(1)
        expect(mockRouter.replace.mock.calls[0]).toEqual(['/login'])
      })

      it('should automatically login', async () => {
        localStorageStore.autoLogin = true
        const wrapper = mountLogin()
        const to = {
          query: {
            redirectPath: '/namespace/garden-foo/shoots',
          },
        }
        mockNext = vi.fn()
        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined, mockNext)
        expect(mockNext).toBeCalledTimes(1)
        expect(mockNext.mock.calls[0]).toEqual([false])
        expect(authnStore.signinWithOidc).toBeCalledTimes(1)
        expect(authnStore.signinWithOidc.mock.calls[0]).toEqual([to.query.redirectPath])
      })
    })
  })
})
