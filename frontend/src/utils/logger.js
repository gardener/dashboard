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

  debug (...args) {
    if (this.level <= levels.debug) {
      console.debug(...args) // eslint-disable-line
    }
  }

  log (...args) {
    if (this.level <= levels.info) {
      console.log(...args) // eslint-disable-line
    }
  }

  info (...args) {
    if (this.level <= levels.info) {
      console.info(...args) // eslint-disable-line
    }
  }

  warn (...args) {
    if (this.level <= levels.warn) {
      console.warn(...args) // eslint-disable-line
    }
  }

  error (...args) {
    if (this.level <= levels.error) {
      console.error(...args) // eslint-disable-line
    }
  }
}

export default function createLogger (storage) {
  const logger = new Logger()
  logger.setLevel(storage.getItem('global/log-level'))
  storage.on('change', (key, value) => {
    if (key === null) {
      logger.setLevel('silent')
    } else if (key === 'global/log-level') {
      logger.setLevel(value)
    }
  })
  return logger
}
