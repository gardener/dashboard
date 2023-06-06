//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBrowserLocation } from '@vueuse/core'
import { useCookies } from '@vueuse/integrations/useCookies'
import decode from 'jwt-decode'

import { useLogger, useInterceptors } from '@/composables'

import { useSocketStore } from './socket'

import {
  gravatarUrlGeneric,
  displayName as getDisplayName,
  fullDisplayName as getFullDisplayName,
} from '@/utils'

import {
  createError,
  createAbortError,
  createNoUserError,
  createClockSkewError,
  isUnauthorizedError,
  isNoUserError,
  isClockSkewError,
} from '@/utils/errors'

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'
const CLOCK_TOLERANCE = 15

function now () {
  return Math.floor(Date.now() / 1000)
}

function secondsUntil (val) {
  if (val) {
    const t = Number(val)
    if (!Number.isNaN(t)) {
      return t - now()
    }
  }
}

function delay (duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

export const useAuthnStore = defineStore('authn', () => {
  const logger = useLogger()
  const location = useBrowserLocation()
  const socketStore = useSocketStore()
  const interceptors = useInterceptors()
  const cookies = useCookies([COOKIE_HEADER_PAYLOAD])

  interceptors.register({
    async requestFulfilled (...args) {
      const url = args[0] ?? ''
      if (url.startsWith('/api')) {
        try {
          await ensureValidToken()
        } catch (err) {
          logger.error(err)
          throw createAbortError('Request aborted')
        }
      }
      return args
    },
  })

  let refreshTokenPromise

  const user = ref(null)

  const isAdmin = computed(() => {
    return user.value?.isAdmin === true
  })

  const username = computed(() => {
    return user.value?.email ?? user.value?.id ?? ''
  })

  const displayName = computed(() => {
    return user.value?.name ?? getDisplayName(user.value?.id) ?? ''
  })

  const fullDisplayName = computed(() => {
    return user.value?.name ?? getFullDisplayName(user.value?.id) ?? ''
  })

  const userExpiresAt = computed(() => {
    return (user.value?.exp ?? 0) * 1000
  })

  const avatarUrl = computed(() => {
    return gravatarUrlGeneric(username.value)
  })

  const avatarTitle = computed(() => {
    return `${displayName.value} (${username.value})`
  })

  function isUserEmpty () {
    return !user.value
  }

  function isExpired () {
    const expiresAt = user.value?.exp
    if (!expiresAt) {
      return true
    }
    const t = secondsUntil(expiresAt)
    return typeof t === 'number' && t < CLOCK_TOLERANCE
  }

  function isRefreshRequired (value) {
    if (typeof value === 'boolean') {
      return value
    }
    const rti = user.value?.rti
    const refreshAt = user.value?.refresh_at
    if (!rti || !refreshAt) {
      return false
    }
    const t = secondsUntil(refreshAt)
    return typeof t === 'number' && t < CLOCK_TOLERANCE
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
      if (isUserEmpty()) {
        throw createNoUserError()
      }
      if (isRefreshRequired(false)) {
        throw createClockSkewError()
      }
      return $reset()
    }

    if (statusCode >= 400) {
      let message = `Token refresh failed with status code ${statusCode}`
      try {
        const data = await response.json()
        Object.defineProperty(response, 'data', { value: data })
        if (data.message) {
          message = data.message
          if (statusCode === 401) {
            /*
             * The OPError message has the following format `${error} (${error_description})`
             * (see https://github.com/panva/node-openid-client/blob/1e3892e6222fdd1956735f97584ebc722fcebdd3/lib/errors.js#L5)
             * The error and the error_description are values returned in the error response
             * from the the OpenID Connect Provider (OP). We use the original OP error_description
             * as error message if possible.
             */
            const matches = /^(.+) \((.+)\)$/.exec(message)
            if (matches && matches.length > 2) {
              message = matches[2]
            }
          }
        }
      } catch (err) { /* ignore error */ }
      throw createError(statusCode, message, { response })
    }

    throw createError(statusCode, 'Token refresh failed', { response })
  }

  async function refreshToken () {
    try {
      if (isUserEmpty()) {
        throw createNoUserError()
      }
      if (!isRefreshRequired()) {
        return
      }
      const rti = user.value?.rti
      logger.debug('Acquiring token refresh lock (%s)', rti)
      await navigator.locks.request('token-refresh-request', async () => {
        if (isUserEmpty()) {
          throw createNoUserError()
        }
        if (!isRefreshRequired()) {
          return
        }
        const rtiBefore = user.value?.rti
        logger.debug('Refreshing token (%s)', rtiBefore)
        await createTokenRefreshRequest()
        const rtiAfter = user.value?.rti
        logger.debug('Token has been refreshed (%s <- %s)', rtiAfter, rtiBefore)
      })
    } catch (err) {
      logger.error('Token refresh failed: %s - %s', err.name, err.message)
      let frameRequestCallback
      if (isNoUserError(err)) {
        frameRequestCallback = () => signin()
      } else if (isUnauthorizedError(err) || isClockSkewError(err)) {
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

  function signout (err) {
    cookies.remove(COOKIE_HEADER_PAYLOAD)
    const url = new URL('/auth/logout', location.value.origin)
    if (err) {
      url.searchParams.set('error[name]', err.name)
      url.searchParams.set('error[message]', err.message)
    }
    location.value.href = url
  }

  function signin () {
    const url = new URL('/login', location.value.origin)
    location.value.href = url
  }

  function signinWithOidc (redirectPath = '/') {
    const url = new URL('/auth', location.value.origin)
    const redirectUrl = new URL(redirectPath, location.value.origin)
    url.searchParams.set('redirectUrl', redirectUrl)
    location.value.href = url
  }

  function ensureValidToken () {
    if (!refreshTokenPromise) {
      refreshTokenPromise = refreshToken().finally(() => {
        refreshTokenPromise = undefined
      })
    }
    return refreshTokenPromise
  }
  // mutations
  function setUser (value) {
    user.value = value
    if (!user.value) {
      socketStore.disconnect()
    } else {
      socketStore.connect()
    }
  }

  function $reset () {
    try {
      setUser(decode(cookies.get(COOKIE_HEADER_PAYLOAD)))
    } catch (err) {
      logger.error(err.message)
      setUser(null)
    }
  }

  return {
    user,
    isAdmin,
    username,
    displayName,
    fullDisplayName,
    userExpiresAt,
    avatarUrl,
    avatarTitle,
    isExpired,
    signout,
    signin,
    signinWithOidc,
    ensureValidToken,
    $reset,
  }
})
