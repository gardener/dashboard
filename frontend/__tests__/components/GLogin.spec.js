//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  mount,
  flushPromises,
} from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'

import GLogin from '@/layouts/GLogin.vue'

import { useApi } from '@/composables/useApi'

import {
  components as componentsPlugin,
  utils as utilsPlugin,
  notify as notifyPlugin,
} from '@/plugins'

const { createVuetifyPlugin } = global.fixtures.helper

vi.mock('@/composables/useApi', async importOriginal => ({
  ...await importOriginal(),
  useApi: vi.fn(),
}))

describe('components', () => {
  describe('g-login', () => {
    const noop = () => {}

    let pinia
    let appStore
    let authnStore
    let loginStore
    let localStorageStore
    let mockRoute
    let mockRouter
    let mockApi

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
      mockRouter = { push: vi.fn().mockResolvedValue(undefined) }
      mockApi = { createTokenReview: vi.fn().mockResolvedValue(undefined) }
      vi.mocked(useApi).mockReturnValue(mockApi)
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

      expect(wrapper.find('div.text-headline-small.text-primary').text()).toBe('Universal Kubernetes at Scale')
    })

    describe('token login', () => {
      const token = 'test-token'

      beforeEach(() => {
        loginStore.loginTypes = ['oidc', 'token']
        loginStore.loginType = 'token'
      })

      it('should retain the token until authentication and navigation finish', async () => {
        const review = Promise.withResolvers()
        const navigation = Promise.withResolvers()
        mockApi.createTokenReview.mockReturnValue(review.promise)
        mockRouter.push.mockReturnValue(navigation.promise)
        const wrapper = mountLogin()
        const input = wrapper.find('input')
        await input.setValue(token)

        const login = wrapper.vm.tokenLogin()
        await nextTick()

        expect(mockApi.createTokenReview).toBeCalledWith({ token })
        expect(mockRouter.push).not.toBeCalled()
        expect(input.element.value).toBe(token)

        review.resolve()
        await flushPromises()

        expect(mockRouter.push).toBeCalledWith(mockRoute.query.redirectPath)
        expect(input.element.value).toBe(token)

        navigation.resolve()
        await login
        await nextTick()

        expect(input.element.value).toBe('')
        expect(appStore.setError).not.toBeCalled()
      })

      it('should ignore repeated submissions while authentication or navigation is pending', async () => {
        const review = Promise.withResolvers()
        const navigation = Promise.withResolvers()
        mockApi.createTokenReview.mockReturnValue(review.promise)
        mockRouter.push.mockReturnValue(navigation.promise)
        const wrapper = mountLogin()
        const input = wrapper.find('input')
        await input.setValue(token)

        wrapper.vm.$refs.loginButton.$emit('click')
        wrapper.vm.handleLogin()
        await input.trigger('keydown.enter')

        expect(mockApi.createTokenReview).toBeCalledTimes(1)
        expect(input.element.disabled).toBe(true)
        expect(wrapper.vm.$refs.loginButton.loading).toBe(true)
        expect(wrapper.vm.$refs.loginButton.disabled).toBe(true)
        expect(wrapper.findAllComponents({ name: 'VTab' }).every(tab => tab.props('disabled'))).toBe(true)

        review.resolve()
        await flushPromises()
        wrapper.vm.handleLogin()
        await input.trigger('keydown.enter')

        expect(mockApi.createTokenReview).toBeCalledTimes(1)
        expect(mockRouter.push).toBeCalledTimes(1)
        expect(wrapper.vm.$refs.loginButton.loading).toBe(true)

        navigation.resolve()
        await flushPromises()

        expect(input.element.disabled).toBe(false)
        expect(wrapper.vm.$refs.loginButton.loading).toBe(false)
        expect(wrapper.vm.$refs.loginButton.disabled).toBe(false)
        expect(wrapper.findAllComponents({ name: 'VTab' }).every(tab => !tab.props('disabled'))).toBe(true)
      })

      it.each(['authentication', 'navigation'])('should report %s errors and allow retrying', async stage => {
        const error = new Error('login failed')
        const failingAction = stage === 'authentication' ? mockApi.createTokenReview : mockRouter.push
        failingAction.mockRejectedValueOnce(error)
        const wrapper = mountLogin()
        const input = wrapper.find('input')
        await input.setValue(token)

        await wrapper.vm.tokenLogin()
        await nextTick()

        expect(appStore.setError).toBeCalledWith({
          title: 'Token Login Error',
          text: error.message,
        })
        expect(input.element.value).toBe('')
        expect(input.element.disabled).toBe(false)
        expect(wrapper.vm.$refs.loginButton.loading).toBe(false)
        expect(wrapper.vm.$refs.loginButton.disabled).toBe(false)
        expect(mockRouter.push).toBeCalledTimes(stage === 'authentication' ? 0 : 1)

        await input.setValue('replacement-token')
        await wrapper.vm.tokenLogin()

        expect(mockApi.createTokenReview).toBeCalledTimes(2)
        expect(mockApi.createTokenReview).toHaveBeenLastCalledWith({ token: 'replacement-token' })
        expect(mockRouter.push).toHaveBeenLastCalledWith(mockRoute.query.redirectPath)
        expect(appStore.setError).toBeCalledTimes(1)
      })

      it('should use the default redirect when none is supplied', async () => {
        mockRoute.query = {}
        const wrapper = mountLogin()
        await wrapper.find('input').setValue(token)

        await wrapper.vm.tokenLogin()

        expect(mockRouter.push).toBeCalledWith('/')
      })
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

        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined)
        expect(wrapper.vm.loginError.message).toBe(error.message)
        await GLogin.mounted.call(wrapper.vm)
        expect(appStore.setError).toBeCalledTimes(1)
        expect(appStore.setError.mock.calls[0]).toEqual([
          expect.objectContaining({
            message: 'error',
            title: 'title',
          }),
        ])
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

        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined)
        await GLogin.mounted.call(wrapper.vm)
        expect(appStore.setError).not.toBeCalled()
      })

      it('should automatically login', async () => {
        localStorageStore.autoLogin = true
        const wrapper = mountLogin()
        const to = {
          query: {
            redirectPath: '/namespace/garden-foo/shoots',
          },
        }
        await GLogin.beforeRouteEnter.call(wrapper.vm, to, undefined)
        expect(authnStore.signinWithOidc).toBeCalledTimes(1)
        expect(authnStore.signinWithOidc.mock.calls[0]).toEqual([to.query.redirectPath])
      })
    })
  })
})
