//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createGlobalState } from '@vueuse/core'
import { useCookies } from '@vueuse/integrations/useCookies'
import { useJwt } from '@vueuse/integrations/useJwt'

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

export const useToken = createGlobalState(() => {
  const cookies = useCookies([COOKIE_HEADER_PAYLOAD])
  const { header, payload } = useJwt(() => cookies.get(COOKIE_HEADER_PAYLOAD))

  function isEmpty () {
    return !payload.value
  }

  function getUser () {
    return payload.value ?? {}
  }

  function isExpired () {
    const user = getUser()
    if (!user.exp) {
      return true
    }
    const t = secondsUntil(user.exp)
    return typeof t === 'number' && t < CLOCK_TOLERANCE
  }

  function isRefreshRequired () {
    const user = getUser()
    if (!user.rti || !user.refresh_at) {
      return false
    }
    const t = secondsUntil(user.refresh_at)
    return typeof t === 'number' && t < CLOCK_TOLERANCE
  }

  function remove () {
    cookies.remove(COOKIE_HEADER_PAYLOAD)
  }

  function update (value) {
    cookies.set(COOKIE_HEADER_PAYLOAD, value)
  }

  return {
    header,
    payload,
    update,
    remove,
    isEmpty,
    isRefreshRequired,
    isExpired,
  }
})
