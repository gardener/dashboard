//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

const FORMATS = ['json', 'text']

// Converts any thrown value to a string without throwing, even for null,
// undefined or objects whose own conversion throws.
function errorMessage (err) {
  try {
    return String(err instanceof Error ? err.message : err)
  } catch {
    return 'unknown error'
  }
}

// Serializes a log record without ever throwing. JSON.stringify turns an Error
// into {} and throws on BigInt values and circular structures.
function stringify (record) {
  const ancestors = []
  const replacer = function (key, value) {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (value instanceof Error) {
      value = { name: value.name, message: value.message, stack: value.stack }
    }
    if (typeof value !== 'object' || value === null) {
      return value
    }
    // `this` is the object that holds the current key
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop()
    }
    if (ancestors.includes(value)) {
      return '[Circular]'
    }
    ancestors.push(value)
    return value
  }
  try {
    return JSON.stringify(record, replacer)
  } catch (err) {
    return JSON.stringify({ level: record.level, ts: record.ts, msg: 'Failed to serialize log record: ' + errorMessage(err) })
  }
}

// Formats the arguments like console.log does. Never throws.
function format (msg, args) {
  try {
    return util.format(msg, ...args)
  } catch (err) {
    return 'Failed to format log message: ' + errorMessage(err)
  }
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
  constructor ({
    logLevel = process.env.LOG_LEVEL,
    logFormat = process.env.LOG_FORMAT,
    logHttpRequestBody = process.env.LOG_HTTP_REQUEST_BODY,
  } = {}) {
    this.logLevel = 2
    this.setLogLevel(logLevel)
    this.logFormat = 'text'
    this.setLogFormat(logFormat)
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

  setLogFormat (value) {
    if (FORMATS.includes(value)) {
      this.logFormat = value
    }
  }

  setLogHttpRequestBody (value) {
    this.logHttpRequestBody = /^true$/i.test(value)
  }

  get isJson () {
    return this.logFormat === 'json'
  }

  inspect (obj) {
    return util.inspect(obj, { depth: Infinity, colors: !this.isJson })
  }

  isDisabled (level) {
    return this.silent || level < this.logLevel
  }

  get ts () {
    const ts = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '')
    return chalk.whiteBright(ts)
  }

  write (method, level, label, msg, args) {
    if (this.isJson) {
      this.console[method](this.serialize(level, format(msg, args))) // eslint-disable-line security/detect-object-injection
    } else {
      this.console[method](this.ts + ' ' + label + msg, ...args) // eslint-disable-line security/detect-object-injection
    }
  }

  serialize (level, msg, fields) {
    return stringify({ level, ts: new Date().toISOString(), msg, ...fields })
  }

  // Writes a structured access log record. Unlike http(), the values are
  // not formatted into msg, so they are JSON-encoded only once.
  access ({ remoteAddr, remoteUser, method, url, httpVersion, status, contentLength }) {
    if (!this.isDisabled(LEVELS.info)) {
      const msg = `${method} ${url} HTTP/${httpVersion} ${status}`
      this.console.info(this.serialize('info', msg, {
        remoteAddr,
        remoteUser,
        method,
        url,
        httpVersion,
        status,
        contentLength,
      }))
    }
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
      this.write('log', 'debug', chalk.black.bgGreen('req') + '  : ', msg, [])
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
      this.write('log', 'debug', chalk.black.bgBlue('res') + '  : ', msg, [])
    }
  }

  http (msg, ...args) {
    if (!this.isDisabled(LEVELS.info)) {
      this.write('log', 'info', chalk.magenta('http') + ' : ', msg, args)
    }
  }

  log (msg, ...args) {
    if (!this.isDisabled(LEVELS.warn)) {
      this.write('log', 'warn', chalk.whiteBright('log') + '  : ', msg, args)
    }
  }

  trace (msg, ...args) {
    if (!this.isDisabled(LEVELS.trace)) {
      this.write('log', 'trace', chalk.cyan('trace') + ': ', msg, args)
    }
  }

  debug (msg, ...args) {
    if (!this.isDisabled(LEVELS.debug)) {
      this.write('debug', 'debug', chalk.blue('debug') + ': ', msg, args)
    }
  }

  info (msg, ...args) {
    if (!this.isDisabled(LEVELS.info)) {
      this.write('info', 'info', chalk.green('info') + ' : ', msg, args)
    }
  }

  warn (msg, ...args) {
    if (!this.isDisabled(LEVELS.warn)) {
      this.write('warn', 'warn', chalk.yellow('warn') + ' : ', msg, args)
    }
  }

  error (msg, ...args) {
    if (!this.isDisabled(LEVELS.error)) {
      this.write('error', 'error', chalk.red('error') + ': ', msg, args)
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
