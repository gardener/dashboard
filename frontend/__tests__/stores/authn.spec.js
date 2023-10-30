//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'

describe('stores', () => {
  describe('authn', () => {
    const originalLocation = window.location
    let authnStore

    function createRedirectUrl (redirectPath) {
      const origin = window.location.origin
      const url = new URL('/auth', origin)
      url.searchParams.set('redirectUrl', new URL(redirectPath, origin))
      return url
    }

    beforeEach(() => {
      window.location = new URL(originalLocation.href)
      setActivePinia(createPinia())
      authnStore = useAuthnStore()
    })

    afterAll(() => {
      window.location = originalLocation
    })

    describe('#signinWithOidc', () => {
      it('should redirect to the home view', () => {
        const redirectPath = '/'
        authnStore.signinWithOidc()
        expect(window.location.href).toBe(createRedirectUrl(redirectPath).href)
      })

      it('should redirect to the admin view', () => {
        const redirectPath = '/namespace/garden-foo/admin'
        authnStore.signinWithOidc(redirectPath)
        expect(window.location.href).toBe(createRedirectUrl(redirectPath).href)
      })
    })
  })
})
