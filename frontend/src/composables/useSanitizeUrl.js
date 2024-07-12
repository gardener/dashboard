//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { unref } from 'vue'

import { useLogger } from './useLogger'

export const BLANK_URL = 'about:blank'

export const useSanitizeUrl = (options = {}) => {
  const {
    logger = useLogger(),
    allowedProtocolRegex = /^(?:https?|mailto):$/i,
  } = options

  return value => {
    try {
      const url = new URL(unref(value))
      if (allowedProtocolRegex.test(url.protocol)) {
        return url.toString()
      }
    } catch (err) {
      logger.error('Failed to parse URL: %s', err.message)
    }
    return BLANK_URL
  }
}
