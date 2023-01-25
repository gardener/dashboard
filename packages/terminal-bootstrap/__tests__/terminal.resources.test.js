//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const {
  toResource,
  toIngressResource,
  toServiceResource,
  toEndpointResource
} = require('../lib/terminal/resources')

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
  })
})
