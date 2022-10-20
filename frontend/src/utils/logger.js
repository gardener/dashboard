//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const levels = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5
}

export class Logger {
  #level

  constructor (level = 'error') {
    this.#level = level
  }

  setLevel (value) {
    if (Object.keys(levels).includes(value)) {
      this.#level = value
    }
  }

  get level () {
    return levels[this.#level]
  }

  get #ts () {
    const ts = new Date().toISOString()
    return ts.substring(0, 10) + ' ' + ts.substring(11, ts.length - 1)
  }

  #print (key, ...args) {
    const prefix = this.#ts + ':'
    if (typeof args[0] === 'string') {
      args.unshift(prefix + ' ' + args.shift())
    } else {
      args.unshift(prefix)
    }
    console[key](...args) // eslint-disable-line
  }

  debug (...args) {
    if (this.level <= levels.debug) {
      this.#print('debug', ...args)
    }
  }

  log (...args) {
    if (this.level <= levels.info) {
      this.#print('log', ...args)
    }
  }

  info (...args) {
    if (this.level <= levels.info) {
      this.#print('info', ...args)
    }
  }

  warn (...args) {
    if (this.level <= levels.warn) {
      this.#print('warn', ...args)
    }
  }

  error (...args) {
    if (this.level <= levels.error) {
      this.#print('error', ...args)
    }
  }
}

export default function createLogger (storage) {
  const logger = new Logger()
  logger.setLevel(storage.getItem('global/log-level'))
  storage.on('change', (key, value) => {
    if (key === null) {
      logger.setLevel('debug')
    } else if (key === 'global/log-level') {
      logger.setLevel(value)
    }
  })
  return logger
}
