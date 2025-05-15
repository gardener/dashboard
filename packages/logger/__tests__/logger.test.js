//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import jestDateMock from 'jest-date-mock'
import chalk from 'chalk'

import { Logger } from '../lib/index.js'
const LEVELS = Logger.LEVELS
const ENV = process.env

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

function createNoisyLogger (logLevel = 'trace', logHttpRequestBody = true) {
  const logger = new Logger({ logLevel, logHttpRequestBody })
  logger.silent = false
  logger.console = ConsoleStub.create()
  return logger
}

describe('logger', () => {
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
  let time
  let mockTimestamp

  beforeEach(() => {
    process.env = { ...ENV }
    time = '2020-09-24T12:00:00.000Z'
    mockTimestamp = chalk.whiteBright('2020-09-24 12:00:00.000')
    jestDateMock.advanceTo(new Date(time))
  })

  afterEach(() => {
    process.env = ENV
    jestDateMock.clear()
  })

  it('should create a silent Logger', () => {
    const logger = new Logger({ logLevel: 'info', logHttpRequestBody: true })
    expect(logger.logLevel).toBe(LEVELS.info)
    expect(logger.logHttpRequestBody).toBe(true)
    expect(logger.silent).toBe(true)
    expect(logger.isDisabled(LEVELS.info)).toBe(true)
  })

  it('should create a noisy Logger', () => {
    process.env.NODE_ENV = 'foo'
    const logger = new Logger({ logLevel: 'info', logHttpRequestBody: true })
    expect(logger.isDisabled(LEVELS.info)).toBe(false)
    expect(logger.isDisabled(LEVELS.debug)).toBe(true)
  })

  it('should get the current timestamp', () => {
    const logger = new Logger()
    expect(logger.ts).toBe(mockTimestamp)
  })

  it('should get the host', () => {
    const headers = {}
    expect(Logger.getHost({}, headers)).toBe('-')
    expect(Logger.getHost(url, headers)).toBe('foo.org')
    headers.host = 'bar.org'
    expect(Logger.getHost(url, headers)).toBe('bar.org')
  })

  it('should get the user identity', () => {
    expect(Logger.getIdentity()).toBe('-')
    expect(Logger.getIdentity('user')).toBe('-')
    expect(Logger.getIdentity(user)).toBe('email=bar@foo.org')
  })

  it('should log a trace message', () => {
    const logger = createNoisyLogger()
    logger.trace(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.cyan('trace') + ': ' + msg, ...args])
  })

  it('should log a debug message', () => {
    const logger = createNoisyLogger()
    logger.debug(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.blue('debug') + ': ' + msg, ...args])
  })

  it('should log a log message', () => {
    const logger = createNoisyLogger()
    logger.log(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.whiteBright('log') + '  : ' + msg, ...args])
  })

  it('should log an info message', () => {
    const logger = createNoisyLogger()
    logger.info(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.green('info') + ' : ' + msg, ...args])
  })

  it('should log a warn message', () => {
    const logger = createNoisyLogger()
    logger.warn(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.yellow('warn') + ' : ' + msg, ...args])
  })

  it('should log an error message', () => {
    const logger = createNoisyLogger()
    logger.error(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.red('error') + ': ' + msg, ...args])
  })

  it('should log a http message', () => {
    const logger = createNoisyLogger()
    logger.http(msg, ...args)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.magenta('http') + ' : ' + msg, ...args])
  })

  it('should log a http message via stream', () => {
    const logger = createNoisyLogger()
    logger.stream.write(msg)
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.magenta('http') + ' : ' + msg])
  })

  it('should log a request message', () => {
    const logger = createNoisyLogger()
    logger.request(requestArgs)
    const msg = `${method} ${url.pathname} HTTP/2 [${id}] ${user.type}=${user.id} ${url.host} ${body}`
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.black.bgGreen('req') + '  : ' + msg])
  })

  it('should log a response message', () => {
    const logger = createNoisyLogger()
    logger.response(responseArgs)
    const msg = `HTTP/2 ${statusCode} ${statusMessage} [${id}]\n${logger.inspect(body)}`
    expect(logger.console.args).toEqual([mockTimestamp + ' ' + chalk.black.bgBlue('res') + '  : ' + msg])
  })
})
