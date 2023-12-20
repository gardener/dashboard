//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const logger = require('../lib/logger')
const { kDryRun } = require('../lib/terminal/symbols')

const {
  toResource,
  toIngressResource,
  toServiceResource,
  toEndpointResource,
  replaceResource,
  deleteEndpointApiServer
} = require('../lib/terminal/resources')

const { soilClient, mocks } = fixtures.clients

describe('terminal', () => {
  describe('resources', () => {
    const name = 'name'
    const namespace = 'namespace'
    const generateName = 'test-name-'
    const spec = {
      baz: 'foo'
    }
    const subsets = {
      baz: 'bar'
    }
    const annotations = {
      foo: 'bar'
    }
    const ownerReferences = [
      { name: 'ownerReferenceName' }
    ]
    const labels = {}

    it('should return an ingress resource', () => {
      const resource = toIngressResource({
        name,
        spec,
        annotations,
        ownerReferences,
        labels
      })
      expect(resource).toMatchSnapshot()
    })

    it('should return a service resource', () => {
      const resource = toServiceResource({
        name,
        namespace,
        spec,
        annotations,
        ownerReferences,
        labels
      })
      expect(resource).toMatchSnapshot()
    })

    it('should return an endpoints resource', () => {
      const resource = toEndpointResource({
        name,
        namespace,
        subsets,
        annotations,
        ownerReferences,
        labels
      })
      expect(resource).toMatchSnapshot()
    })

    it('should return a resource with generateName', () => {
      const resource = toResource({
        resource: { apiVersion: 'test.io/v1', kind: 'Foo' },
        data: { spec },
        generateName,
        annotations,
        ownerReferences,
        labels
      })
      expect(resource).toMatchSnapshot()
    })

    it('should skip replaceResource in dryRun mode', async () => {
      const resource = {
        constructor: {
          version: 'v1',
          names: { kind: 'Service' }
        }
      }
      await expect(replaceResource(resource, { namespace, name, dryRun: true })).resolves.toEqual({ metadata: { namespace, name } })
      expect(logger.info).toBeCalledWith('Replacing resource v1, Kind=Service was skipped in dry run mode')
    })

    describe('deleteEndpointApiServer', () => {
      it('should succeed', async () => {
        await expect(deleteEndpointApiServer(soilClient, { namespace, name })).resolves.toBeUndefined()
      })

      it('should succeed when endpoint not found', async () => {
        const { mockSoilEndpointsDelete } = mocks
        mockSoilEndpointsDelete.mockRejectedValueOnce(createError(404, 'Endpoint not found'))

        await expect(deleteEndpointApiServer(soilClient, { namespace, name })).resolves.toBeUndefined()
      })

      it('should fail on error', async () => {
        const { mockSoilEndpointsDelete } = mocks
        const error = createError(500, 'Server error')
        mockSoilEndpointsDelete.mockRejectedValueOnce(error)

        await expect(deleteEndpointApiServer(soilClient, { namespace, name })).rejects.toThrow(error)
      })

      it('should skip in dryRun mode', async () => {
        const client = {
          [kDryRun]: true
        }
        await expect(deleteEndpointApiServer(client, { namespace, name })).resolves.toBeUndefined()
        expect(logger.info).toBeCalledWith('Deleting resource v1, Kind=Endpoint was skipped in dry run mode')
      })
    })
  })
})
