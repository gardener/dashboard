//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const winston = require('winston')
const config = require('./config')

winston.emitErrs = true

const transports = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || config.logLevel,
    silent: /^test/.test(process.env.NODE_ENV),
    prettyPrint: true,
    colorize: true,
    timestamp: true
  })
]

class Stream {
  constructor (logger) {
    this.logger = logger
  }
  write (message, encoding) {
    /* jshint unused:false */
    if (message) {
      this.logger.info(message.replace(/[\n\s]*$/, ''))
    }
  }
}

const logger = new winston.Logger({
  transports: transports,
  exitOnError: true
})
logger.stream = new Stream(logger)

module.exports = logger
