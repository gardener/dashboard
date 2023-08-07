//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthnStore } from '@/store/authn'
import { useBrowserLocation } from '@vueuse/core'

vi.mock('@vueuse/core', async () => {
  const url = new URL(window.location.href)
  const browserLocation = ref(url)
  const useBrowserLocation = vi.fn().mockReturnValue(browserLocation)
  const actual = await vi.importActual('@vueuse/core')

  return {
    ...actual,
    useBrowserLocation,
    browserLocation,
  }
})

describe('stores', () => {
  describe('cloudProfile', () => {
    let location
    let authnStore

    function createRedirectUrl (redirectPath) {
      const origin = location.value.origin
      const url = new URL('/auth', origin)
      url.searchParams.set('redirectUrl', new URL(redirectPath, origin))
      return url
    }

    beforeAll(() => {
      location = useBrowserLocation()
      setActivePinia(createPinia())
      authnStore = useAuthnStore()
    })

    describe('#signinWithOidc', () => {
      it('should redirect to the home view', () => {
        const redirectPath = '/'
        authnStore.signinWithOidc()
        expect(location.value.href).toBe(createRedirectUrl(redirectPath).href)
      })

      it('should redirect to the admin view', () => {
        const redirectPath = '/namespace/garden-foo/admin'
        authnStore.signinWithOidc(redirectPath)
        expect(location.value.href).toBe(createRedirectUrl(redirectPath).href)
      })
    })
  })
})
