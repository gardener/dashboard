//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useEventListener } from '@vueuse/core'
import { jwtDecode } from 'jwt-decode'

import { useLogger } from '@/composables/useLogger'

import {
  createError,
  createNoUserError,
  createClockSkewError,
  isUnauthorizedError,
  isNoUserError,
  isClockSkewError,
  createSessionExpiredError,
  isSessionExpiredError,
} from '@/utils/errors'

export const COOKIE_HEADER_PAYLOAD = '__Host-gHdrPyl'
const CLOCK_TOLERANCE = 15

function now () {
  return Math.floor(Date.now() / 1000)
}

function delay (duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

function secondsUntil (val) {
  if (val) {
    const t = Number(val)
    if (!Number.isNaN(t)) {
      return t - now()
    }
  }
}

function isRefreshRequired (user) {
  if (!user?.rti || !user?.refresh_at) {
    return false
  }
  const t = secondsUntil(user.refresh_at)
  return typeof t === 'number' && t < CLOCK_TOLERANCE
}

function isExpired (user) {
  if (!user?.exp) {
    return true
  }
  const t = secondsUntil(user.exp)
  return typeof t === 'number' && t < CLOCK_TOLERANCE
}

export function useUserManager (options) {
  const {
    logger = useLogger(),
  } = options ?? {}

  let refreshTokenPromise
  let signoutInProgress = false

  useEventListener(window, 'beforeunload', () => {
    signoutInProgress = true
  })

  const origin = window.location.origin

  async function decodeCookie () {
    try {
      const cookie = await window.cookieStore.get(COOKIE_HEADER_PAYLOAD)
      if (cookie?.value) {
        return jwtDecode(cookie.value)
      }
    } catch (err) {
      logger.error(err.message)
    }
    return null
  }

  async function createTokenRefreshRequest () {
    const timestamp = Math.floor(Date.now() / 1000)
    const response = await fetch('/auth/token', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ timestamp }),
    })

    const statusCode = response.status
    if (statusCode >= 200 && statusCode < 300) {
      const user = await decodeCookie()
      if (!user) {
        throw createNoUserError()
      }
      if (isExpired(user)) {
        throw createSessionExpiredError()
      }
      if (isRefreshRequired(user)) {
        throw createClockSkewError()
      }
      return user
    }

    if (statusCode >= 400) {
      let message = `Token refresh failed with status code ${statusCode}`
      try {
        const data = await response.json()
        Object.defineProperty(response, 'data', { value: data })
        if (data.message) {
          message = data.message
        }
      } catch (err) { /* ignore error */ }
      throw createError(statusCode, message, { response })
    }

    throw createError(statusCode, 'Token refresh failed', { response })
  }

  function redirect (url) {
    window.location.href = url
  }

  async function signout (err, redirectPath) {
    if (signoutInProgress) {
      return
    }
    signoutInProgress = true
    try {
      await window.cookieStore.delete(COOKIE_HEADER_PAYLOAD)
    } catch (deleteError) {
      logger.error(deleteError.message)
    }
    const url = new URL('/auth/logout', origin)
    redirectPath ??= window.location.pathname + window.location.search
    if (redirectPath) {
      url.searchParams.set('redirectPath', redirectPath)
    }
    if (err) {
      url.searchParams.set('error[name]', err.name)
      url.searchParams.set('error[message]', err.message)
    }
    redirect(url)
  }

  useEventListener(window.cookieStore, 'change', event => {
    if (event.deleted?.some(cookie => cookie.name === COOKIE_HEADER_PAYLOAD)) {
      signout()
    }
  })

  function signin (redirectPath) {
    const url = new URL('/login', origin)
    redirectPath ??= window.location.pathname + window.location.search
    if (redirectPath) {
      url.searchParams.set('redirectPath', redirectPath)
    }
    redirect(url)
  }

  function signinWithOidc (redirectPath = '/') {
    const url = new URL('/auth', origin)
    const redirectUrl = new URL(redirectPath, origin)
    url.searchParams.set('redirectUrl', redirectUrl)
    redirect(url)
  }

  async function refreshToken () {
    try {
      let user = await decodeCookie()
      if (!user) {
        throw createNoUserError()
      }
      if (isExpired(user)) {
        throw createSessionExpiredError()
      }
      if (!isRefreshRequired(user)) {
        return
      }
      logger.debug('Acquiring token refresh lock (%s)', user.rti)
      await navigator.locks.request('token-refresh-request', async () => {
        user = await decodeCookie()
        if (!user) {
          throw createNoUserError()
        }
        if (isExpired(user)) {
          throw createSessionExpiredError()
        }
        if (!isRefreshRequired(user)) {
          return
        }
        logger.debug('Refreshing token (%s)', user.rti)
        const oldUser = user
        user = await createTokenRefreshRequest()
        logger.debug('Token has been refreshed (%s <- %s)', user.rti, oldUser.rti)
      })
    } catch (err) {
      logger.error('Token refresh failed: %s - %s', err.name, err.message)
      let frameRequestCallback
      if (isNoUserError(err)) {
        frameRequestCallback = () => signin()
      } else if (isSessionExpiredError(err) || isUnauthorizedError(err) || isClockSkewError(err)) {
        frameRequestCallback = () => signout(err)
      }
      if (typeof frameRequestCallback === 'function') {
        window.requestAnimationFrame(frameRequestCallback)
        // delay the error by 500 ms to avoid rendering or navigation before redirection has started
        await delay(500)
      }
      throw err
    }
  }

  function ensureValidToken () {
    if (!refreshTokenPromise) {
      refreshTokenPromise = refreshToken().finally(() => {
        refreshTokenPromise = undefined
      })
    }
    return refreshTokenPromise
  }

  return {
    decodeCookie,
    async isRefreshRequired () {
      return isRefreshRequired(await decodeCookie())
    },
    async isExpired () {
      return isExpired(await decodeCookie())
    },
    signin,
    signout,
    signinWithOidc,
    refreshToken,
    ensureValidToken,
  }
}
