//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { UserManager } from '@/utils/auth'

describe('utils', () => {
  describe('auth', () => {
    const origin = 'https://localhost:8443'
    let auth

    function createRedirectUrl (redirectPath) {
      const url = new URL('/auth', origin)
      url.searchParams.set('redirectUrl', new URL(redirectPath, origin))
      return url
    }

    beforeEach(() => {
      auth = new UserManager()
      auth.origin = 'https://localhost:8443'
      auth.redirect = jest.fn()
    })

    describe('#signinWithOidc', () => {
      it('should redirect to the home view', () => {
        const redirectPath = '/'
        auth.signinWithOidc()
        expect(auth.redirect).toBeCalledTimes(1)
        expect(auth.redirect.mock.calls[0]).toHaveLength(1)
        expect(auth.redirect.mock.calls[0][0].href).toBe(createRedirectUrl(redirectPath).href)
      })

      it('should redirect to the admin view', () => {
        const redirectPath = '/namespace/garden-foo/admin'
        auth.signinWithOidc(redirectPath)
        expect(auth.redirect).toBeCalledTimes(1)
        expect(auth.redirect.mock.calls[0]).toHaveLength(1)
        expect(auth.redirect.mock.calls[0][0].href).toBe(createRedirectUrl(redirectPath).href)
      })
    })
  })
})
