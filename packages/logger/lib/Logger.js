//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import chalk from 'chalk'
import util from 'util'

const LEVELS = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
}

class Stream {
  constructor (logger) {
    this.logger = logger
  }

  write (msg) {
    this.logger.http(msg.replace(/[\n\s]*$/, ''))
  }
}

class Logger {
  constructor ({ logLevel = process.env.LOG_LEVEL, logHttpRequestBody = process.env.LOG_HTTP_REQUEST_BODY } = {}) {
    this.logLevel = 2
    this.setLogLevel(logLevel)
    this.logHttpRequestBody = false
    this.setLogHttpRequestBody(logHttpRequestBody)
    this.silent = /^test/.test(process.env.NODE_ENV)
    this.console = global.console
    this.stream = new Stream(this)
  }

  setLogLevel (value) {
    if (Reflect.has(LEVELS, value)) {
      this.logLevel = LEVELS[value] // eslint-disable-line security/detect-object-injection
    }
  }

  setLogHttpRequestBody (value) {
    this.logHttpRequestBody = /^true$/i.test(value)
  }

  inspect (obj) {
    return util.inspect(obj, { depth: Infinity, colors: true })
  }

  isDisabled (level) {
    return this.silent || level < this.logLevel
  }

  get ts () {
    const ts = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '')
    return chalk.whiteBright(ts)
  }

  request ({ id, url, method, httpVersion = '2', user, headers, body }) {
    if (!this.isDisabled(LEVELS.debug)) {
      const ident = this.constructor.getIdentity(user)
      const host = this.constructor.getHost(url, headers)
      const path = this.constructor.getPath(url)
      id = id || headers['x-request-id']
      let msg = `${method} ${path} HTTP/${httpVersion} [${id}] ${ident} ${host}`
      if (this.logHttpRequestBody && body) {
        msg += ' ' + body.toString('utf8')
      }
      this.console.log(this.ts + ' ' + chalk.black.bgGreen('req') + '  : ' + msg)
    }
  }

  response ({ id, url, method, statusCode, statusMessage = '', httpVersion = '2', headers, duration, body }) {
    if (!this.isDisabled(LEVELS.debug)) {
      let msg = `HTTP/${httpVersion} ${statusCode} ${statusMessage} [${id}]`
      if (method && url) {
        msg += ` ${method} ${url.path || (url.pathname + url.search)}`
      }
      if (duration) {
        msg += ` ${duration}ms`
      }
      if (body && statusCode >= 300 && !this.isDisabled(LEVELS.trace)) {
        msg += '\n' + this.inspect(body)
      }
      this.console.log(this.ts + ' ' + chalk.black.bgBlue('res') + '  : ' + msg)
    }
  }

  http (msg, ...args) {
    if (!this.isDisabled(LEVELS.info)) {
      this.console.log(this.ts + ' ' + chalk.magenta('http') + ' : ' + msg, ...args)
    }
  }

  log (msg, ...args) {
    if (!this.isDisabled(LEVELS.warn)) {
      this.console.log(this.ts + ' ' + chalk.whiteBright('log') + '  : ' + msg, ...args)
    }
  }

  trace (msg, ...args) {
    if (!this.isDisabled(LEVELS.trace)) {
      this.console.log(this.ts + ' ' + chalk.cyan('trace') + ': ' + msg, ...args)
    }
  }

  debug (msg, ...args) {
    if (!this.isDisabled(LEVELS.debug)) {
      this.console.debug(this.ts + ' ' + chalk.blue('debug') + ': ' + msg, ...args)
    }
  }

  info (msg, ...args) {
    if (!this.isDisabled(LEVELS.info)) {
      this.console.info(this.ts + ' ' + chalk.green('info') + ' : ' + msg, ...args)
    }
  }

  warn (msg, ...args) {
    if (!this.isDisabled(LEVELS.warn)) {
      this.console.warn(this.ts + ' ' + chalk.yellow('warn') + ' : ' + msg, ...args)
    }
  }

  error (msg, ...args) {
    if (!this.isDisabled(LEVELS.error)) {
      this.console.error(this.ts + ' ' + chalk.red('error') + ': ' + msg, ...args)
    }
  }

  static getIdentity (user) {
    return user && typeof user === 'object' ? `${user.type}=${user.id}` : '-'
  }

  static getHost (url, headers) {
    return headers.host || url.host || '-'
  }

  static getPath (url) {
    return url.path || (url.pathname + url.search)
  }
}

Logger.prototype.LEVELS = Logger.LEVELS = LEVELS

export default Logger
