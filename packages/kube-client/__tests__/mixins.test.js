//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { camelCase } from 'lodash-es'
import http2 from 'http2'
import { mix } from 'mixwith'
import { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup, NamespaceScoped, ClusterScoped, Readable, Observable, Writable } from '../lib/mixins.js'
import { PatchType } from '../lib/util.js'
import { Informer } from '../lib/cache/index.js'
import { http } from '../lib/symbols.js'
const { HTTP2_HEADER_CONTENT_TYPE } = http2.constants

describe('kube-client', () => {
  describe('mixins', () => {
    const testOptions = {
      foo: 'bar',
    }
    const dryRunOptions = {
      dryRun: true,
    }
    const testInformer = {}
    Informer.create = jest.fn(() => testInformer)

    class TestClient {
      [http.request] (...args) {
        return args
      }

      [http.stream] (...args) {
        return args
      }

      static get group () {
        return 'group'
      }

      static get version () {
        return 'version'
      }

      static get names () {
        return {
          plural: 'dummies',
        }
      }
    }

    beforeEach(() => {
      Informer.create.mockClear()
    })

    describe('Version', () => {
      class V1Object extends V1(Object) {}
      class V1Alpha1Object extends V1Alpha1(Object) {}
      class V1Beta1Object extends V1Beta1(Object) {}

      it('should check that Version mixins do not occur in the inheritance hierarchy', () => {
        expect(new V1Object()).toHaveProperty('constructor.version', 'v1')
        expect(() => new V1Object() instanceof V1).toThrow(TypeError)
        expect(new V1Alpha1Object()).toHaveProperty('constructor.version', 'v1alpha1')
        expect(() => new V1Alpha1Object() instanceof V1Alpha1).toThrow(TypeError)
        expect(new V1Beta1Object()).toHaveProperty('constructor.version', 'v1beta1')
        expect(() => new V1Beta1Object() instanceof V1Beta1).toThrow(TypeError)
      })
    })

    describe('ApiGroup', () => {
      class CoreGroupObject extends CoreGroup(Object) {}
      class NamedGroupObject extends NamedGroup(Object) {}

      it('should check that ApiGroup mixins do not occur in the inheritance hierarchy', () => {
        expect(() => new CoreGroupObject() instanceof CoreGroup).toThrow(TypeError)
        expect(() => new NamedGroupObject() instanceof NamedGroup).toThrow(TypeError)
      })
    })

    describe('ClusterScoped', () => {
      class TestObject extends mix(TestClient).with(ClusterScoped, Readable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', () => {
        const testObject = new TestObject()
        expect(testObject).toHaveProperty('constructor.scope', 'Cluster')
        expect(testObject).toBeInstanceOf(ClusterScoped)
        expect(testObject).toBeInstanceOf(Readable)
        expect(testObject).toBeInstanceOf(Observable)
        expect(testObject).toBeInstanceOf(Writable)
      })

      describe('Readable', () => {
        it('should get a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('name', {})
          expect(url).toBe('dummies/name')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list({})
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })
      })

      describe('Observable', () => {
        it('should watch a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.watch('name')
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.watchList()
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('watch=true')
        })

        it('should create an informer', () => {
          const testObject = new TestObject()
          testObject.list = jest.fn()
          testObject.watchList = jest.fn()
          expect(testObject.informer()).toBe(testInformer)
          expect(Informer.create).toHaveBeenCalledTimes(1)
          const [listWatcher] = Informer.create.mock.calls[0]
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          listWatcher.list(testOptions)
          expect(testObject.list).toHaveBeenCalledTimes(1)
          const listCall = testObject.list.mock.calls[0]
          expect(listCall.length).toBe(1)
          expect(listCall[0].searchParams.toString()).toBe('foo=bar')
          listWatcher.watch(testOptions)
          const watchCall = testObject.watchList.mock.calls[0]
          expect(watchCall.length).toBe(1)
          expect(watchCall[0].searchParams.toString()).toBe('foo=bar')
        })
      })

      describe('Writable', () => {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('name', testBody, dryRunOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('patch')
          expect(headers[HTTP2_HEADER_CONTENT_TYPE]).toBe(patchContentType)
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        }

        it('should create a resource', () => {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create(testBody, dryRunOptions)
          expect(url).toBe('dummies')
          expect(method).toBe('post')
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        })

        it('should update a resource', () => {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('name', testBody, dryRunOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('put')
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        })

        it('should merge patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        it('should strategic merge patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        it('should json patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('name', dryRunOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('dryRun=true')
        })

        it('should delete multiple resources', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection(dryRunOptions)
          expect(url).toBe('dummies')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('dryRun=true')
        })
      })
    })

    describe('NamespaceScoped', () => {
      class TestObject extends mix(TestClient).with(NamespaceScoped, Readable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', () => {
        const testObject = new TestObject()
        expect(testObject).toHaveProperty('constructor.scope', 'Namespaced')
        expect(testObject).toBeInstanceOf(NamespaceScoped)
        expect(testObject).toBeInstanceOf(Readable)
        expect(testObject).toBeInstanceOf(Observable)
        expect(testObject).toBeInstanceOf(Writable)
      })

      describe('Readable', () => {
        it('should get a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('namespace', 'name', {})
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list('namespace', {})
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource across all namespaces', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.listAllNamespaces({})
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })
      })

      describe('Observable', () => {
        it('should watch a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.watch('namespace', 'name')
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.watchList('namespace')
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('watch=true')
        })

        it('should watch a list of resources across all namespaces', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.watchListAllNamespaces()
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('watch=true')
        })

        it('should create an informer', () => {
          const testObject = new TestObject()
          testObject.list = jest.fn()
          testObject.watchList = jest.fn()
          expect(testObject.informer('namespace')).toBe(testInformer)
          expect(Informer.create).toHaveBeenCalledTimes(1)
          const [listWatcher] = Informer.create.mock.calls[0]
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          listWatcher.list(testOptions)
          expect(testObject.list).toHaveBeenCalledTimes(1)
          const listCall = testObject.list.mock.calls[0]
          expect(listCall.length).toBe(2)
          expect(listCall[0]).toBe('namespace')
          expect(listCall[1].searchParams.toString()).toBe('foo=bar')
          listWatcher.watch(testOptions)
          const watchCall = testObject.watchList.mock.calls[0]
          expect(watchCall.length).toBe(2)
          expect(watchCall[0]).toBe('namespace')
          expect(watchCall[1].searchParams.toString()).toBe('foo=bar')
        })

        it('should create an informer across all namespaces', () => {
          const testObject = new TestObject()
          testObject.listAllNamespaces = jest.fn()
          testObject.watchListAllNamespaces = jest.fn()
          expect(testObject.informerAllNamespaces()).toBe(testInformer)
          expect(Informer.create).toHaveBeenCalledTimes(1)
          const [listWatcher] = Informer.create.mock.calls[0]
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          listWatcher.list(testOptions)
          expect(testObject.listAllNamespaces).toHaveBeenCalledTimes(1)
          const listCall = testObject.listAllNamespaces.mock.calls[0]
          expect(listCall.length).toBe(1)
          expect(listCall[0].searchParams.toString()).toBe('foo=bar')
          listWatcher.watch(testOptions)
          const watchCall = testObject.watchListAllNamespaces.mock.calls[0]
          expect(watchCall.length).toBe(1)
          expect(watchCall[0].searchParams.toString()).toBe('foo=bar')
        })
      })

      describe('Writable', () => {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('namespace', 'name', testBody, dryRunOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('patch')
          expect(headers[HTTP2_HEADER_CONTENT_TYPE]).toBe(patchContentType)
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        }

        it('should create a resource', () => {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create('namespace', testBody, dryRunOptions)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('post')
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        })

        it('should update a resource', () => {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('namespace', 'name', testBody, dryRunOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('put')
          expect(searchParams.toString()).toBe('dryRun=true')
          expect(json).toBe(testBody)
        })

        it('should merge patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        it('should strategic merge patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        it('should json patch a resource', () => {
          expect.assertions(5)
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('namespace', 'name', dryRunOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('dryRun=true')
        })

        it('should delete multiple resources', () => {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection('namespace', dryRunOptions)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('dryRun=true')
        })
      })
    })
  })
})
