//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { get } = require('lodash')
const config = require('./config')

const LEVELS = {
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5
}
const level = get(LEVELS, process.env.LOG_LEVEL || config.logLevel, 3)
const silent = /^test/.test(process.env.NODE_ENV)

class Logger {
  constructor () {
    const self = this
    this.stream = {
      write (message, encoding) {
        /* jshint unused:false */
        if (message) {
          self.http(message.replace(/[\n\s]*$/, ''))
        }
      }
    }
  }
  get ts () {
    return '\u001b[37m' + new Date().toISOString() + '\u001b[39m'
  }
  request ({ id, uri, method, httpVersion, user, headers, body }) {
    if (!silent && level <= LEVELS.trace) {
      const ident = user && typeof user === 'object' ? `${user.type}=${user.id}` : '-'
      const host = headers.host || '-'
      let msg = `${method} ${uri.path} HTTP/${httpVersion} [${id}] ${ident} ${host}`
      if (config.logHttpRequestBody === true && body) {
        msg += ' ' + body.toString('utf8')
      }
      console.log(this.ts + ' - \u001b[42mreq\u001b[49m: ' + msg)
    }
  }
  response ({ id, statusCode, reasonPhrase = '', httpVersion, headers, body }) {
    if (!silent && level <= LEVELS.trace) {
      let msg = `HTTP/${httpVersion} ${statusCode} ${reasonPhrase} [${id}]`
      if (body && statusCode >= 300) {
        msg += ' ' + body.toString('utf8')
      }
      console.log(this.ts + ' - \u001b[44mres\u001b[49m: ' + msg)
    }
  }
  http (msg, ...args) {
    if (!silent && level <= LEVELS.warn) {
      console.log(this.ts + ' - \u001b[35mhttp\u001b[39m: ' + msg, ...args)
    }
  }
  log (msg, ...args) {
    if (!silent && level <= LEVELS.warn) {
      console.log(this.ts + ' - \u001b[90mlog\u001b[39m: ' + msg, ...args)
    }
  }
  trace (msg, ...args) {
    if (!silent && level <= LEVELS.trace) {
      console.log(this.ts + ' - \u001b[36mtrace\u001b[39m: ' + msg, ...args)
    }
  }
  debug (msg, ...args) {
    if (!silent && level <= LEVELS.debug) {
      console.debug(this.ts + ' - \u001b[34mdebug\u001b[39m: ' + msg, ...args)
    }
  }
  info (msg, ...args) {
    if (!silent && level <= LEVELS.info) {
      console.info(this.ts + ' - \u001b[32minfo\u001b[39m: ' + msg, ...args)
    }
  }
  warn (msg, ...args) {
    if (!silent && level <= LEVELS.warn) {
      console.warn(this.ts + ' - \u001b[33mwarn\u001b[39m: ' + msg, ...args)
    }
  }
  error (msg, ...args) {
    if (!silent && level <= LEVELS.error) {
      console.error(this.ts + ' - \u001b[31merror\u001b[39m: ' + msg, ...args)
    }
  }
}

module.exports = new Logger()
