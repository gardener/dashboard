//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createSharedComposable, useBrowserLocation } from '@vueuse/core'
import { useToken, useLogger } from '@/composables'

// Local
import {
  createError,
  createNoUserError,
  createClockSkewError,
  isUnauthorizedError,
  isNoUserError,
  isClockSkewError,
} from '@/utils/errors'

function delay (duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

export const useAuthn = createSharedComposable(() => {
  const logger = useLogger()
  const location = useBrowserLocation()
  const token = useToken()

  let refreshTokenPromise

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
      if (token.isEmpty()) {
        throw createNoUserError()
      }
      if (token.isRefreshRequired()) {
        throw createClockSkewError()
      }
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

  function getUser () {
    return token.payload.value
  }

  async function refreshToken () {
    try {
      if (token.isEmpty()) {
        throw createNoUserError()
      }
      if (!token.isRefreshRequired()) {
        return
      }
      const user = getUser()
      logger.debug('Acquiring token refresh lock (%s)', user.rti)
      await navigator.locks.request('token-refresh-request', async () => {
        if (token.isEmpty()) {
          throw createNoUserError()
        }
        if (!token.isRefreshRequired()) {
          return
        }
        const oldUser = getUser()
        logger.debug('Refreshing token (%s)', oldUser.rti)
        await createTokenRefreshRequest()
        const user = getUser()
        logger.debug('Token has been refreshed (%s <- %s)', user.rti, oldUser.rti)
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
    token.remove()
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
      refreshTokenPromise = refreshToken(token.payload).finally(() => {
        refreshTokenPromise = undefined
      })
    }
    return refreshTokenPromise
  }

  function isSessionExpired () {
    return token.isExpired()
  }

  return {
    signin,
    signout,
    signinWithOidc,
    ensureValidToken,
    isSessionExpired,
  }
})
