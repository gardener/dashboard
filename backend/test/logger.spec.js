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

const chalk = require('chalk')
const Logger = require('../lib/logger/Logger')
const LEVELS = Logger.LEVELS

class ConsoleStub {
  constructor () {
    this.args = []
  }

  debug (...args) {
    this.args.push(...args)
  }

  log (...args) {
    this.args.push(...args)
  }

  info (...args) {
    this.args.push(...args)
  }

  warn (...args) {
    this.args.push(...args)
  }

  error (...args) {
    this.args.push(...args)
  }

  static create () {
    return new ConsoleStub()
  }
}

class TestLogger extends Logger {
  constructor (options) {
    super(options)
    this.silent = false
    this.console = ConsoleStub.create()
  }

  get ts () {
    return 'D T'
  }
}

function createNoisyLogger (logLevel = 'trace', logHttpRequestBody = true) {
  return new TestLogger({ logLevel, logHttpRequestBody })
}

describe('logger', function () {
  const sandbox = sinon.createSandbox()
  const msg = 'foo'
  const args = ['bar', 1, true]
  const method = 'GET'
  const user = { type: 'email', id: 'bar@foo.org' }
  const id = 1
  const headers = { 'x-request-id': id }
  const url = new URL('https://foo.org/bar')
  const body = 'body'
  const requestArgs = { url, method, user, headers, body }
  const statusCode = 404
  const statusMessage = 'Not found'
  const responseArgs = { id, statusCode, statusMessage, body }

  afterEach(function () {
    sandbox.restore()
  })

  it('should create a silent Logger', function () {
    const logger = new Logger({ logLevel: 'info', logHttpRequestBody: true })
    expect(logger.logLevel).to.be.equal(LEVELS.info)
    expect(logger.logHttpRequestBody).to.be.equal(true)
    expect(logger.silent).to.be.equal(true)
    expect(logger.isDisabled(LEVELS.info)).to.equal(true)
  })

  it('should create a noisy Logger', function () {
    sandbox.stub(process.env, 'NODE_ENV').value('foo')
    const logger = new Logger({ logLevel: 'info', logHttpRequestBody: true })
    expect(logger.isDisabled(LEVELS.info)).to.equal(false)
    expect(logger.isDisabled(LEVELS.debug)).to.equal(true)
  })

  it('should log a trace message', function () {
    const logger = createNoisyLogger()
    logger.trace(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.cyan('trace') + ': ' + msg, ...args])
  })

  it('should log a debug message', function () {
    const logger = createNoisyLogger()
    logger.debug(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.blue('debug') + ': ' + msg, ...args])
  })

  it('should log a log message', function () {
    const logger = createNoisyLogger()
    logger.log(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.whiteBright('log') + '  : ' + msg, ...args])
  })

  it('should log an info message', function () {
    const logger = createNoisyLogger()
    logger.info(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.green('info') + ' : ' + msg, ...args])
  })

  it('should log a warn message', function () {
    const logger = createNoisyLogger()
    logger.warn(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.yellow('warn') + ' : ' + msg, ...args])
  })

  it('should log an error message', function () {
    const logger = createNoisyLogger()
    logger.error(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.red('error') + ': ' + msg, ...args])
  })

  it('should log a http message', function () {
    const logger = createNoisyLogger()
    logger.http(msg, ...args)
    expect(logger.console.args).to.eql(['D T ' + chalk.magenta('http') + ' : ' + msg, ...args])
  })

  it('should log a request message', function () {
    const logger = createNoisyLogger()
    logger.request(requestArgs)
    const msg = `${method} ${url.pathname} HTTP/1.1 [${id}] ${user.type}=${user.id} ${url.host} ${body}`
    expect(logger.console.args).to.eql(['D T ' + chalk.black.bgGreen('req') + '  : ' + msg])
  })

  it('should log a response message', function () {
    const logger = createNoisyLogger()
    logger.response(responseArgs)
    const msg = `HTTP/1.1 ${statusCode} ${statusMessage} [${id}]\n${logger.inspect(body)}`
    expect(logger.console.args).to.eql(['D T ' + chalk.black.bgBlue('res') + '  : ' + msg])
  })
})
