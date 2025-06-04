//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { AssertionError } = require('assert').strict
const { merge, cloneDeep } = require('lodash')
const {
  encodeBase64,
  decodeBase64,
  getConfigValue,
  shootHasIssue,
  getSeedNameFromShoot,
  parseSelectors,
  filterBySelectors,
  constants,
  simplifyObjectMetadata,
  simplifyProject,
  parseRooms,
} = require('../dist/lib/utils')

describe('utils', function () {
  describe('index', function () {
    it('should base64 encode some values', function () {
      expect(encodeBase64()).toBeUndefined()
      expect(encodeBase64('')).toBeUndefined()
      expect(encodeBase64('foo')).toBe('Zm9v')
    })

    it('should base64 decode some values', function () {
      expect(decodeBase64()).toBeUndefined()
      expect(decodeBase64('')).toBeUndefined()
      expect(decodeBase64('Zm9v')).toBe('foo')
    })

    it('should return some config values with defaults', function () {
      expect(() => getConfigValue('test')).toThrow(AssertionError)
      expect(getConfigValue('logLevel')).toBe('info')
    })

    it('should return if a shoot has issues', function () {
      const shoot = {
        metadata: {
          labels: {
            'shoot.gardener.cloud/status': undefined,
          },
        },
      }
      expect(shootHasIssue(shoot)).toBe(false)
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'healthy'
      expect(shootHasIssue(shoot)).toBe(false)
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'unhealthy'
      expect(shootHasIssue(shoot)).toBe(true)
    })

    it('should return the seed name for a shoot resource', function () {
      expect(() => getSeedNameFromShoot({})).toThrow(AssertionError)
      const shoot = {
        spec: {
          seedName: 'foo',
        },
        status: {
          seed: 'bar',
        },
      }
      expect(getSeedNameFromShoot(shoot)).toBe('foo')
    })

    it('should trim object metadata', () => {
      const name = 'test'
      const managedFields = 'managedFields'
      const lastAppliedConfiguration = 'last-applied-configuration'
      const metadata = {
        name,
        annotations: {
          foo: 'bar',
        },
      }
      expect(simplifyObjectMetadata({ metadata })).toEqual({ metadata })
      const extendedMetadata = merge(metadata, {
        managedFields,
        annotations: {
          'kubectl.kubernetes.io/last-applied-configuration': lastAppliedConfiguration,
        },
      })
      expect(simplifyObjectMetadata({ metadata: extendedMetadata })).toEqual({ metadata })
    })

    it('should trim project metadata and remove spec.members', () => {
      const name = 'test'
      const managedFields = 'managedFields'
      const lastAppliedConfiguration = 'last-applied-configuration'
      const metadata = {
        name,
        annotations: {
          foo: 'bar',
        },
      }
      const spec = {
        members: ['member1', 'member2'],
      }
      const project = { metadata, spec }

      // Test case where metadata does not have managedFields or last-applied-configuration
      expect(simplifyProject(cloneDeep(project))).toEqual({
        metadata,
        spec: {},
      })

      // Test case where metadata has managedFields and last-applied-configuration
      const extendedMetadata = merge(cloneDeep(metadata), {
        managedFields,
        annotations: {
          'kubectl.kubernetes.io/last-applied-configuration': lastAppliedConfiguration,
        },
      })
      const extendedProject = { metadata: extendedMetadata, spec }

      expect(simplifyProject(cloneDeep(extendedProject))).toEqual({
        metadata,
        spec: {},
      })
    })

    it('should parse labelSelectors', () => {
      expect(parseSelectors([
        'shoot.gardener.cloud/status!=healthy',
      ])).toEqual([{
        key: 'shoot.gardener.cloud/status',
        op: constants.NOT_EQUAL,
        value: 'healthy',
      }])
      expect(parseSelectors([
        'foo=1',
        'bar==2',
        'qux!=3',
      ])).toEqual([{
        key: 'foo',
        op: constants.EQUAL,
        value: '1',
      }, {
        key: 'bar',
        op: constants.EQUAL,
        value: '2',
      }, {
        key: 'qux',
        op: constants.NOT_EQUAL,
        value: '3',
      }])
      expect(parseSelectors([
        'foo',
        '!baz',
      ])).toEqual([{
        key: 'foo',
        op: constants.EXISTS,
      }, {
        key: 'baz',
        op: constants.NOT_EXISTS,
      }])
    })

    it('should filter by labelSelectors', () => {
      const labels = {
        foo: '1',
        bar: '2',
        qux: '3',
      }
      const item = {
        metadata: {
          labels,
        },
      }
      expect(filterBySelectors([{
        key: 'foo',
        op: constants.EXISTS,
      }])(item)).toBe(true)
      expect(filterBySelectors([{
        key: 'baz',
        op: constants.EXISTS,
      }])(item)).toBe(false)
      expect(filterBySelectors([{
        key: 'baz',
        op: constants.NOT_EXISTS,
      }])(item)).toBe(true)
      expect(filterBySelectors([{
        key: 'foo',
        op: constants.NOT_EXISTS,
      }])(item)).toBe(false)
      expect(filterBySelectors([{
        key: 'foo',
        op: constants.EQUAL,
        value: '1',
      }])(item)).toBe(true)
      expect(filterBySelectors([{
        key: 'bar',
        op: constants.EQUAL,
        value: '1',
      }])(item)).toBe(false)
      expect(filterBySelectors([{
        key: 'qux',
        op: constants.NOT_EQUAL,
        value: '2',
      }])(item)).toBe(true)
      expect(filterBySelectors([{
        key: 'qux',
        op: constants.NOT_EQUAL,
        value: '3',
      }])(item)).toBe(false)
    })

    it('should parse rooms for all kind of shoot subscriptions', () => {
      expect(parseRooms(['seeds:admin'])).toEqual([
        false, [], [],
      ])
      expect(parseRooms(['shoots:admin'])).toEqual([
        true, [], [],
      ])
      expect(parseRooms(['shoots:unhealthy:admin'])).toEqual([
        true, [], [],
      ])
      expect(parseRooms(['shoots;garden-foo'])).toEqual([
        false, ['garden-foo'], [],
      ])
      expect(parseRooms(['shoots:unhealthy;garden-foo'])).toEqual([
        false, ['garden-foo'], [],
      ])
      expect(parseRooms(['shoots;garden-foo/bar'])).toEqual([
        false, [], ['garden-foo/bar'],
      ])
    })
  })
})
