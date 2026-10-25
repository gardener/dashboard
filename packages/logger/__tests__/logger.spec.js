//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import util from 'util'
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date(time))
  })

  afterEach(() => {
    process.env = ENV
    vi.useRealTimers()
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

  describe('json format', () => {
    const ANSI = /\u001b\[[0-9;]*m/ // eslint-disable-line no-control-regex

    function createJsonLogger (logLevel = 'trace') {
      const logger = createNoisyLogger(logLevel)
      logger.setLogFormat('json')
      return logger
    }

    function lastRecord (logger) {
      expect(logger.console.args).toHaveLength(1)
      const [line] = logger.console.args
      expect(line).not.toMatch(/\n/)
      expect(line).not.toMatch(ANSI)
      return JSON.parse(line)
    }

    it('should default to text and ignore unknown formats', () => {
      const logger = new Logger()
      expect(logger.logFormat).toBe('text')
      logger.setLogFormat('foo')
      expect(logger.logFormat).toBe('text')
      logger.setLogFormat('json')
      expect(logger.logFormat).toBe('json')
      expect(logger.isJson).toBe(true)
      expect(new Logger({ logFormat: 'json' }).logFormat).toBe('json')
    })

    it('should read the format from the environment', () => {
      process.env.LOG_FORMAT = 'json'
      expect(new Logger().logFormat).toBe('json')
    })

    it.each([
      ['trace', 'trace'],
      ['debug', 'debug'],
      ['info', 'info'],
      ['warn', 'warn'],
      ['error', 'error'],
      ['log', 'warn'],
      ['http', 'info'],
    ])('should log a %s message as json record with level %s', (method, level) => {
      const logger = createJsonLogger()
      logger[method](msg, ...args)
      expect(lastRecord(logger)).toEqual({
        level,
        ts: time,
        msg: 'foo bar 1 true',
      })
    })

    it('should format printf-style arguments like console does', () => {
      const logger = createJsonLogger()
      logger.warn('%s failed with %d: %j', 'job', 42, { a: 1 })
      expect(lastRecord(logger).msg).toBe('job failed with 42: {"a":1}')
    })

    it('should write the record as a single line with escaped line breaks and control characters', () => {
      const logger = createJsonLogger()
      const value = 'a\nb\r\n{"level":"error","msg":"forged"}\u001b[31mred\u001b[0m\u0007'
      logger.info('value: %s', value)
      const [line] = logger.console.args
      expect(line).not.toMatch(/[\u0000-\u001f]/) // eslint-disable-line no-control-regex
      expect(JSON.parse(line)).toEqual({
        level: 'info',
        ts: time,
        msg: 'value: ' + value,
      })
    })

    it('should respect the log level', () => {
      const logger = createJsonLogger('warn')
      logger.info(msg)
      logger.debug(msg)
      expect(logger.console.args).toEqual([])
      logger.warn(msg)
      expect(lastRecord(logger).level).toBe('warn')
    })

    it('should use the same console methods as the text format', () => {
      const logger = createJsonLogger()
      logger.console = { error: vi.fn(), log: vi.fn() }
      logger.error(msg)
      logger.trace(msg)
      expect(logger.console.error).toHaveBeenCalledTimes(1)
      expect(logger.console.log).toHaveBeenCalledTimes(1)
    })

    it('should write a fallback record if serializing or formatting throws a non-Error', () => {
      const logger = createJsonLogger()
      const field = { toJSON () { throw null } } // eslint-disable-line no-throw-literal
      expect(() => logger.console.info(logger.serialize('info', 'msg', { field }))).not.toThrow()
      expect(JSON.parse(logger.console.args[0]).msg).toBe('Failed to serialize log record: null')
      logger.console.args.length = 0

      const obj = {
        [util.inspect.custom] () { throw undefined }, // eslint-disable-line no-throw-literal
      }
      expect(() => logger.info('%o', obj)).not.toThrow()
      expect(lastRecord(logger).msg).toBe('Failed to format log message: undefined')
      logger.console.args.length = 0

      const thrown = { toString () { throw new TypeError('x') } }
      const obj2 = { [util.inspect.custom] () { throw thrown } }
      expect(() => logger.info('%o', obj2)).not.toThrow()
      expect(lastRecord(logger).msg).toBe('Failed to format log message: unknown error')
    })

    it('should not throw for errors, circular structures and BigInt values', () => {
      const logger = createJsonLogger()
      const circular = { name: 'circular' }
      circular.self = circular
      const err = new Error('boom')

      expect(() => logger.error('failed: %s', err)).not.toThrow()
      expect(lastRecord(logger).msg).toContain('Error: boom')
      logger.console.args.length = 0

      expect(() => logger.error('circular: %o', circular)).not.toThrow()
      expect(lastRecord(logger).msg).toContain('[Circular')
      logger.console.args.length = 0

      expect(() => logger.error('big: %d %s', 10n, 20n)).not.toThrow()
      expect(lastRecord(logger).msg).toBe('big: 10n 20n')
      logger.console.args.length = 0

      expect(() => logger.error(err)).not.toThrow()
      expect(lastRecord(logger).msg).toContain('Error: boom')
    })

    it('should not throw if the message can not be formatted', () => {
      const logger = createJsonLogger()
      const bad = { toString () { throw new Error('nope') } }
      expect(() => logger.error('%s', bad)).not.toThrow()
      expect(lastRecord(logger).msg).toMatch(/^Failed to format log message: /)
    })

    it('should serialize errors, circular structures and BigInt values in fields', () => {
      const logger = createJsonLogger()
      const circular = { name: 'circular', list: [] }
      circular.list.push(circular)
      const shared = { a: 1 }
      const err = new Error('boom')
      const line = logger.serialize('error', msg, { err, circular, big: 1n, one: shared, two: shared })
      const record = JSON.parse(line)
      expect(record.err).toEqual({ name: 'Error', message: 'boom', stack: err.stack })
      expect(record.circular).toEqual({ name: 'circular', list: ['[Circular]'] })
      expect(record.big).toBe('1')
      expect(record.one).toEqual(shared)
      expect(record.two).toEqual(shared)
    })

    it('should fall back to a minimal record if serializing fails', () => {
      const logger = createJsonLogger()
      const bad = { toJSON () { throw new Error('nope') } }
      const record = JSON.parse(logger.serialize('error', msg, { bad }))
      expect(record).toEqual({
        level: 'error',
        ts: time,
        msg: 'Failed to serialize log record: nope',
      })
    })

    it('should not use colors when inspecting', () => {
      const logger = createJsonLogger()
      expect(logger.inspect({ a: 'b', c: 1 })).not.toMatch(ANSI)
      logger.setLogFormat('text')
      expect(logger.inspect({ a: 'b', c: 1 })).toMatch(ANSI)
    })

    it('should log request and response records without color codes', () => {
      const logger = createJsonLogger()
      logger.request(requestArgs)
      expect(lastRecord(logger)).toEqual({
        level: 'debug',
        ts: time,
        msg: `${method} ${url.pathname} HTTP/2 [${id}] ${user.type}=${user.id} ${url.host} ${body}`,
      })
      logger.console.args.length = 0
      logger.response({ ...responseArgs, body: { message: 'Not found' } })
      expect(lastRecord(logger)).toEqual({
        level: 'debug',
        ts: time,
        msg: `HTTP/2 ${statusCode} ${statusMessage} [${id}]\n{ message: 'Not found' }`,
      })
    })

    it('should log an access record without escaping the values twice', () => {
      const logger = createJsonLogger()
      logger.access({
        remoteAddr: '10.0.0.1',
        remoteUser: undefined,
        method: 'GET',
        url: '/foo?bar="baz"\nqux',
        httpVersion: '1.1',
        status: 200,
        contentLength: 12,
      })
      const [line] = logger.console.args
      expect(line).not.toContain('\\\\')
      expect(JSON.parse(line)).toEqual({
        level: 'info',
        ts: time,
        msg: 'GET /foo?bar="baz"\nqux HTTP/1.1 200',
        remoteAddr: '10.0.0.1',
        method: 'GET',
        url: '/foo?bar="baz"\nqux',
        httpVersion: '1.1',
        status: 200,
        contentLength: 12,
      })
    })

    it('should not log an access record if info is disabled', () => {
      const logger = createJsonLogger('warn')
      logger.access({ method: 'GET', url: '/', httpVersion: '1.1', status: 200 })
      expect(logger.console.args).toEqual([])
    })
  })
})
