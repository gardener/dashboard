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

    beforeEach(() => {
      auth = new UserManager()
      auth.origin = 'https://localhost:8443'
      auth.redirect = jest.fn()
    })

    describe('#signinWithOidc', () => {
      it('should redirect to the home view', () => {
        auth.signinWithOidc()
        expect(auth.redirect).toBeCalledTimes(1)
        const url = new URL('/auth', origin)
        url.searchParams.set('redirectUrl', new URL('/', origin))
        expect(auth.redirect).toBeCalledTimes(1)
        expect(auth.redirect.mock.calls[0]).toHaveLength(1)
        expect(auth.redirect.mock.calls[0][0].href).toEqual(url.href)
      })

      it('should redirect to the admin view', () => {
        auth.signinWithOidc()
        expect(auth.redirect).toBeCalledTimes(1)
        const url = new URL('/auth', origin)
        url.searchParams.set('redirectUrl', new URL('/namespace/garden-foo/admin', origin))
        expect(auth.redirect).toBeCalledTimes(1)
        expect(auth.redirect.mock.calls[0]).toHaveLength(1)
        expect(auth.redirect.mock.calls[0][0].href).toEqual(url.href)
      })
    })
  })
})
