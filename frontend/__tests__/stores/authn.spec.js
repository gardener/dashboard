//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { COOKIE_HEADER_PAYLOAD } from '@/store/authn/helper'

import { useLogger } from '@/composables/useLogger'

function encodeJwt (payload) {
  const encode = value => btoa(JSON.stringify(value))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`
}

function unixNow () {
  return Math.floor(Date.now() / 1000)
}

function createUserClaims (overrides = {}) {
  const now = unixNow()
  return {
    id: 'john.doe',
    email: 'john.doe@example.org',
    name: 'John Doe',
    isAdmin: true,
    rti: 'rti-1',
    refresh_at: now + 3600,
    exp: now + 7200,
    ...overrides,
  }
}

function dispatchCookieChange ({ changed = [], deleted = [] } = {}) {
  window.cookieStore.dispatchEvent(Object.assign(new Event('change'), {
    changed,
    deleted,
  }))
}

describe('stores', () => {
  describe('authn', () => {
    const originalLocation = window.location
    let authnStore
    let pinia

    function createRedirectUrl (redirectPath) {
      const origin = window.location.origin
      const url = new URL('/auth', origin)
      url.searchParams.set('redirectUrl', new URL(redirectPath, origin))
      return url
    }

    function createLogoutUrl (redirectPath) {
      const origin = window.location.origin
      const url = new URL('/auth/logout', origin)
      if (redirectPath) {
        url.searchParams.set('redirectPath', redirectPath)
      }
      return url
    }

    async function setSessionCookie (claims) {
      await window.cookieStore.set(COOKIE_HEADER_PAYLOAD, encodeJwt(claims))
    }

    beforeEach(async () => {
      window.location = new URL(originalLocation.href)
      pinia = createPinia()
      setActivePinia(pinia)
      authnStore = useAuthnStore()
      await nextTick()
    })

    afterEach(() => {
      authnStore.$dispose()
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

    describe('#$reset', () => {
      it('should await Cookie Store and decode the readable JWT into user', async () => {
        const claims = createUserClaims()
        await setSessionCookie(claims)

        await authnStore.$reset()

        expect(authnStore.user).toMatchObject({
          id: claims.id,
          email: claims.email,
          name: claims.name,
          isAdmin: true,
          rti: claims.rti,
        })
      })
    })

    describe('#ensureValidToken', () => {
      it('should re-read the new cookie after a successful token refresh', async () => {
        const oldClaims = createUserClaims({
          rti: 'rti-old',
          refresh_at: unixNow(),
        })
        const newClaims = createUserClaims({
          rti: 'rti-new',
          refresh_at: unixNow() + 3600,
        })
        await setSessionCookie(oldClaims)

        fetch.mockResponseOnce(async () => {
          await setSessionCookie(newClaims)
          return {
            status: 200,
            body: '{}',
          }
        })

        await authnStore.ensureValidToken()
        await authnStore.$reset()

        expect(authnStore.user.rti).toBe('rti-new')
        expect(fetch).toHaveBeenCalledWith('/auth/token', expect.objectContaining({
          method: 'POST',
        }))
      })
    })

    describe('#signout', () => {
      it('should delete exactly the readable session cookie before redirecting to logout', async () => {
        await setSessionCookie(createUserClaims())
        const deleteSpy = vi.spyOn(window.cookieStore, 'delete')
        const redirectPath = window.location.pathname + window.location.search

        await authnStore.signout()

        expect(deleteSpy).toHaveBeenCalledTimes(1)
        expect(deleteSpy).toHaveBeenCalledWith(COOKIE_HEADER_PAYLOAD)
        expect(await window.cookieStore.get(COOKIE_HEADER_PAYLOAD)).toBeNull()
        expect(window.location.href).toBe(createLogoutUrl(redirectPath).href)
      })

      it('should still redirect to logout when the client-side delete is rejected', async () => {
        const logger = useLogger()
        const errorSpy = vi.spyOn(logger, 'error')
        vi.spyOn(window.cookieStore, 'delete').mockRejectedValue(new Error('delete failed'))
        const redirectPath = window.location.pathname + window.location.search

        await authnStore.signout()

        expect(errorSpy).toHaveBeenCalledWith('delete failed')
        expect(window.location.href).toBe(createLogoutUrl(redirectPath).href)
      })

      it('should ignore the initiating tab\'s own deletion event', async () => {
        await setSessionCookie(createUserClaims())
        const deleteSpy = vi.spyOn(window.cookieStore, 'delete')

        await authnStore.signout()

        expect(deleteSpy).toHaveBeenCalledTimes(1)
        expect(window.location.pathname).toBe('/auth/logout')
      })
    })

    describe('cookieStore change', () => {
      it('should sign out when the session cookie is deleted in another tab', async () => {
        await setSessionCookie(createUserClaims())
        const redirectPath = window.location.pathname + window.location.search

        dispatchCookieChange({
          deleted: [{ name: COOKIE_HEADER_PAYLOAD }],
        })
        await Promise.resolve()

        expect(window.location.href).toBe(createLogoutUrl(redirectPath).href)
      })

      it('should ignore unrelated deletions and changed-cookie events', async () => {
        await setSessionCookie(createUserClaims())
        const href = window.location.href

        dispatchCookieChange({
          deleted: [{ name: 'unrelated' }],
        })
        dispatchCookieChange({
          changed: [{ name: COOKIE_HEADER_PAYLOAD }],
        })
        await Promise.resolve()

        expect(window.location.href).toBe(href)
        expect(await window.cookieStore.get(COOKIE_HEADER_PAYLOAD)).not.toBeNull()
      })

      it('should remove the change listener when the store is disposed', () => {
        expect(window.cookieStore.listenerCount).toBe(1)

        authnStore.$dispose()

        expect(window.cookieStore.listenerCount).toBe(0)
      })
    })
  })
})
