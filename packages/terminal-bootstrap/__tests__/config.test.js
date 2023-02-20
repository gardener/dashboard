//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const fixtures = require('../__fixtures__')
const originalConfig = jest.requireActual('../lib/config/config')

const { getFilename, getDefaults, read } = originalConfig

describe('config', () => {
  const pathToGardenerConfig = '/path/to/pardener/config'
  let env

  beforeEach(() => {
    env = {}
  })

  describe('#getFilename', () => {
    it('should return the value of the environment variable GARDENER_CONFIG', () => {
      env.GARDENER_CONFIG = pathToGardenerConfig
      expect(getFilename({ env })).toBe(env.GARDENER_CONFIG)
    })

    it('should return the default location', () => {
      expect(getFilename({ env })).toMatch(/\.gardener[\\/]config\.yaml$/)
    })
  })

  describe('#getDefaults', () => {
    it('should return the default test config', () => {
      env.NODE_ENV = 'test'
      expect(getDefaults({ env })).toMatchSnapshot()
    })

    it('should return the default production config', () => {
      env.NODE_ENV = 'production'
      expect(getDefaults({ env })).toMatchSnapshot()
    })
  })

  describe('#load', () => {
    let mockRead

    beforeEach(() => {
      mockRead = jest.spyOn(originalConfig, 'read').mockReturnValue(fixtures.config.default)
    })

    afterEach(() => {
      mockRead.mockRestore()
    })

    it('should load the config', () => {
      env.NODE_ENV = 'production'
      env.GARDENER_CONFIG = pathToGardenerConfig
      expect(originalConfig.load({ env })).toMatchSnapshot()
      expect(mockRead).toBeCalledTimes(1)
      expect(mockRead.mock.calls[0]).toEqual([pathToGardenerConfig])
    })
  })

  describe('#read', () => {
    let mockReadFileSync

    beforeEach(() => {
      mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue('foo: bar')
    })

    afterEach(() => {
      mockReadFileSync.mockRestore()
    })

    it('should read a yaml file', () => {
      expect(read(pathToGardenerConfig)).toEqual({ foo: 'bar' })
    })
  })
})
