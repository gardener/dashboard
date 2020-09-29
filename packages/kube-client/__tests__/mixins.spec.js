//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const { camelCase } = require('lodash')
const { Agent } = require('http')
const { mix } = require('mixwith')
const mixins = require('../lib/mixins')
const WatchBuilder = require('../lib/WatchBuilder')
const { PatchType } = require('../lib/util')
const { Reflector, Store } = require('../lib/cache')
const {
  http: httpSymbols,
  ws: wsSymbols
} = require('../lib/symbols')
const { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup, NamespaceScoped, ClusterScoped, Readable, Observable, Cacheable, Writable } = mixins

describe('kube-client', function () {
  describe('mixins', function () {
    const testStore = new Store()
    const testOptions = {
      foo: 'bar'
    }
    let testReflector
    let testReconnector
    let testAgent
    let createReflectorStub
    let createAgentStub
    let createReconnectorStub
    let runReflectorSpy

    class TestAgent extends Agent {}

    class TestClient {
      get [httpSymbols.client] () {
        return {
          defaults: {
            options: {
              prefixUrl: 'url'
            }
          }
        }
      }

      [httpSymbols.request] (...args) {
        return args
      }

      [wsSymbols.connect] (...args) {
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
          plural: 'dummies'
        }
      }

      static createAgent (url, options) {
        return testAgent
      }
    }

    class TestReflector {
      run () {}
    }

    class TestReconnector {}

    function beforeEachCachableTest () {
      testAgent = new TestAgent()
      testReflector = new TestReflector()
      testReconnector = new TestReconnector()
      createReflectorStub = jest.spyOn(Reflector, 'create').mockReturnValue(testReflector)
      createAgentStub = jest.spyOn(TestClient, 'createAgent').mockReturnValue(testAgent)
      runReflectorSpy = jest.spyOn(testReflector, 'run')
    }

    function beforeEachObservableTest () {
      createReconnectorStub = jest.spyOn(WatchBuilder, 'create').mockReturnValue(testReconnector)
    }

    describe('Version', function () {
      class V1Object extends V1(Object) {}
      class V1Alpha1Object extends V1Alpha1(Object) {}
      class V1Beta1Object extends V1Beta1(Object) {}

      it('should check that Version mixins do not occur in the inheritance hierarchy', function () {
        expect(new V1Object()).toHaveProperty('constructor.version', 'v1')
        expect(() => new V1Object() instanceof V1).toThrowError(TypeError)
        expect(new V1Alpha1Object()).toHaveProperty('constructor.version', 'v1alpha1')
        expect(() => new V1Alpha1Object() instanceof V1Alpha1).toThrowError(TypeError)
        expect(new V1Beta1Object()).toHaveProperty('constructor.version', 'v1beta1')
        expect(() => new V1Beta1Object() instanceof V1Beta1).toThrowError(TypeError)
      })
    })

    describe('ApiGroup', function () {
      class CoreGroupObject extends CoreGroup(Object) {}
      class NamedGroupObject extends NamedGroup(Object) {}

      it('should check that ApiGroup mixins do not occur in the inheritance hierarchy', function () {
        expect(() => new CoreGroupObject() instanceof CoreGroup).toThrowError(TypeError)
        expect(() => new NamedGroupObject() instanceof NamedGroup).toThrowError(TypeError)
      })
    })

    describe('ClusterScoped', function () {
      class TestObject extends mix(TestClient).with(ClusterScoped, Readable, Cacheable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', function () {
        const testObject = new TestObject()
        expect(testObject).toHaveProperty('constructor.scope', 'Cluster')
        expect(testObject).toBeInstanceOf(ClusterScoped)
        expect(testObject).toBeInstanceOf(Readable)
        expect(testObject).toBeInstanceOf(Cacheable)
        expect(testObject).toBeInstanceOf(Observable)
        expect(testObject).toBeInstanceOf(Writable)
      })

      describe('Readable', function () {
        it('should get a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('name', {})
          expect(url).toBe('dummies/name')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list({})
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('name', { watch: true })
          expect(url).toBe('dummies')
          expect(method).toBeUndefined()
          expect(searchParams.toString()).toBe('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list({ watch: true })
          expect(url).toBe('dummies')
          expect(method).toBeUndefined()
          expect(searchParams.toString()).toBe('watch=true')
        })
      })

      describe('Cachable', function () {
        beforeEach(beforeEachCachableTest)

        it('should sync a list of resources', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncList(testStore)
          expect(createReflectorStub).toHaveBeenCalledTimes(1)
          const [listWatcher, store] = createReflectorStub.mock.calls[0]
          expect(store).toBe(testStore)
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          expect(createAgentStub).toHaveBeenCalledTimes(1)
          const listStub = jest.spyOn(testObject, 'list')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).toHaveBeenCalledTimes(2)
          let listCallArgs
          listCallArgs = listStub.mock.calls[0]
          expect(listCallArgs.length).toBe(1)
          expect(listCallArgs[0].agent).toBe(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).toBeNull()
          expect(listCallArgs[0].searchParams.get('foo')).toBe('bar')
          listCallArgs = listStub.mock.calls[1]
          expect(listCallArgs.length).toBe(1)
          expect(listCallArgs[0].agent).toBe(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).toBe('true')
          expect(listCallArgs[0].searchParams.get('foo')).toBe('bar')
          expect(runReflectorSpy).toHaveBeenCalledTimes(1)
          expect(reflector).toBe(testReflector)
        })
      })

      describe('Observable', function () {
        beforeEach(beforeEachObservableTest)

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watch('name', testOptions)
          expect(createReconnectorStub).toHaveBeenCalledTimes(1)
          const [object, url, searchParams, name] = createReconnectorStub.mock.calls[0]
          expect(object).toBe(testObject)
          expect(url).toBe('dummies')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(name).toBe('name')
          expect(reconnector).toBe(testReconnector)
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchList(testOptions)
          expect(createReconnectorStub).toHaveBeenCalledTimes(1)
          const [object, url, searchParams] = createReconnectorStub.mock.calls[0]
          expect(object).toBe(testObject)
          expect(url).toBe('dummies')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(reconnector).toBe(testReconnector)
        })
      })

      describe('Writable', function () {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('name', testBody, testOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('patch')
          expect(headers['Content-Type']).toBe(patchContentType)
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        }

        it('should create a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create(testBody, testOptions)
          expect(url).toBe('dummies')
          expect(method).toBe('post')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        })

        it('should update a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('name', testBody, testOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('put')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        })

        // eslint-disable-next-line jest/expect-expect
        it('should merge patch a resource', function () {
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        // eslint-disable-next-line jest/expect-expect
        it('should strategic merge patch a resource', function () {
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        // eslint-disable-next-line jest/expect-expect
        it('should json patch a resource', function () {
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('name', testOptions)
          expect(url).toBe('dummies/name')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('foo=bar')
        })

        it('should delete multiple resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection(testOptions)
          expect(url).toBe('dummies')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('foo=bar')
        })
      })
    })

    describe('NamespaceScoped', function () {
      class TestObject extends mix(TestClient).with(NamespaceScoped, Readable, Cacheable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', function () {
        const testObject = new TestObject()
        expect(testObject).toHaveProperty('constructor.scope', 'Namespaced')
        expect(testObject).toBeInstanceOf(NamespaceScoped)
        expect(testObject).toBeInstanceOf(Readable)
        expect(testObject).toBeInstanceOf(Cacheable)
        expect(testObject).toBeInstanceOf(Observable)
        expect(testObject).toBeInstanceOf(Writable)
      })

      describe('Readable', function () {
        it('should get a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('namespace', 'name', {})
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list('namespace', {})
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should list a resource across all namespaces', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.listAllNamespaces({})
          expect(url).toBe('dummies')
          expect(method).toBe('get')
          expect(searchParams.toString()).toBe('')
        })

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('namespace', 'name', { watch: true })
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBeUndefined()
          expect(searchParams.toString()).toBe('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list('namespace', { watch: true })
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBeUndefined()
          expect(searchParams.toString()).toBe('watch=true')
        })

        it('should watch a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.listAllNamespaces({ watch: true })
          expect(url).toBe('dummies')
          expect(method).toBeUndefined()
          expect(searchParams.toString()).toBe('watch=true')
        })
      })

      describe('Cachable', function () {
        beforeEach(beforeEachCachableTest)

        it('should sync a list of resources', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncList('namesace', testStore)
          expect(createReflectorStub).toHaveBeenCalledTimes(1)
          const [listWatcher, store] = createReflectorStub.mock.calls[0]
          expect(store).toBe(testStore)
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          expect(createAgentStub).toHaveBeenCalledTimes(1)
          const listStub = jest.spyOn(testObject, 'list')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).toHaveBeenCalledTimes(2)
          let listCallArgs
          listCallArgs = listStub.mock.calls[0]
          expect(listCallArgs.length).toBe(2)
          expect(listCallArgs[0]).toBe('namesace')
          expect(listCallArgs[1].agent).toBe(testAgent)
          expect(listCallArgs[1].searchParams.get('watch')).toBeNull()
          expect(listCallArgs[1].searchParams.get('foo')).toBe('bar')
          listCallArgs = listStub.mock.calls[1]
          expect(listCallArgs.length).toBe(2)
          expect(listCallArgs[0]).toBe('namesace')
          expect(listCallArgs[1].agent).toBe(testAgent)
          expect(listCallArgs[1].searchParams.get('watch')).toBe('true')
          expect(listCallArgs[1].searchParams.get('foo')).toBe('bar')
          expect(runReflectorSpy).toHaveBeenCalledTimes(1)
          expect(reflector).toBe(testReflector)
        })

        it('should sync a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncListAllNamespaces(testStore)
          expect(createReflectorStub).toHaveBeenCalledTimes(1)
          const [listWatcher, store] = createReflectorStub.mock.calls[0]
          expect(store).toBe(testStore)
          expect(listWatcher.group).toBe(TestObject.group)
          expect(listWatcher.version).toBe(TestObject.version)
          expect(listWatcher.names).toEqual(TestObject.names)
          expect(createAgentStub).toHaveBeenCalledTimes(1)
          const listStub = jest.spyOn(testObject, 'listAllNamespaces')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).toHaveBeenCalledTimes(2)
          let listCallArgs
          listCallArgs = listStub.mock.calls[0]
          expect(listCallArgs.length).toBe(1)
          expect(listCallArgs[0].agent).toBe(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).toBeNull()
          expect(listCallArgs[0].searchParams.get('foo')).toBe('bar')
          listCallArgs = listStub.mock.calls[1]
          expect(listCallArgs.length).toBe(1)
          expect(listCallArgs[0].agent).toBe(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).toBe('true')
          expect(listCallArgs[0].searchParams.get('foo')).toBe('bar')
          expect(runReflectorSpy).toHaveBeenCalledTimes(1)
          expect(reflector).toBe(testReflector)
        })
      })

      describe('Observable', function () {
        beforeEach(beforeEachObservableTest)

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watch('namespace', 'name', testOptions)
          expect(createReconnectorStub).toHaveBeenCalledTimes(1)
          const [object, url, searchParams, name] = createReconnectorStub.mock.calls[0]
          expect(object).toBe(testObject)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(name).toBe('name')
          expect(reconnector).toBe(testReconnector)
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchList('namespace', testOptions)
          expect(createReconnectorStub).toHaveBeenCalledTimes(1)
          const [object, url, searchParams] = createReconnectorStub.mock.calls[0]
          expect(object).toBe(testObject)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(reconnector).toBe(testReconnector)
        })

        it('should watch a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchListAllNamespaces(testOptions)
          expect(createReconnectorStub).toHaveBeenCalledTimes(1)
          const [object, url, searchParams] = createReconnectorStub.mock.calls[0]
          expect(object).toBe(testObject)
          expect(url).toBe('dummies')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(reconnector).toBe(testReconnector)
        })
      })

      describe('Writable', function () {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('namespace', 'name', testBody, testOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('patch')
          expect(headers['Content-Type']).toBe(patchContentType)
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        }

        it('should create a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create('namespace', testBody, testOptions)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('post')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        })

        it('should update a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('namespace', 'name', testBody, testOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('put')
          expect(searchParams.toString()).toBe('foo=bar')
          expect(json).toBe(testBody)
        })

        it('should merge patch a resource', function () {
          expect.hasAssertions()
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        it('should strategic merge patch a resource', function () {
          expect.hasAssertions()
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        it('should json patch a resource', function () {
          expect.hasAssertions()
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('namespace', 'name', testOptions)
          expect(url).toBe('namespaces/namespace/dummies/name')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('foo=bar')
        })

        it('should delete multiple resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection('namespace', testOptions)
          expect(url).toBe('namespaces/namespace/dummies')
          expect(method).toBe('delete')
          expect(searchParams.toString()).toBe('foo=bar')
        })
      })
    })
  })
})
