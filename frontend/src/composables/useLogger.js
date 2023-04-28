//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed, markRaw  } from 'vue'
import { createGlobalState, useLocalStorage } from '@vueuse/core'

const LEVELS = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
}

function print (key, ...args) {
  const ts = new Date().toISOString()
  const prefix = ts.substring(0, 10) + ' ' + ts.substring(11, ts.length - 1) + ':'
  if (typeof args[0] === 'string') {
    args.unshift(prefix + ' ' + args.shift())
  } else {
    args.unshift(prefix)
  }
  console[key](...args) // eslint-disable-line no-console
}

export const useLogger = createGlobalState(() => {
  const logLevels = markRaw(Object.keys(LEVELS))
  const logLevel = useLocalStorage('global/log-level', 'debug')

  const level = computed(() => LEVELS[logLevel.value])

  function debug (...args) {
    if (level.value <= LEVELS.debug) {
      print('debug', ...args)
    }
  }

  function log (...args) {
    if (level.value <= LEVELS.info) {
      print('log', ...args)
    }
  }

  function info (...args) {
    if (level.value <= LEVELS.info) {
      print('info', ...args)
    }
  }

  function warn (...args) {
    if (level.value <= LEVELS.warn) {
      print('warn', ...args)
    }
  }

  function error (...args) {
    if (level.value <= LEVELS.error) {
      print('error', ...args)
    }
  }

  return {
    logLevels,
    logLevel,
    debug,
    log,
    info,
    warn,
    error,
  }
})
