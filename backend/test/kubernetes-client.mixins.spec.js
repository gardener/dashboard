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

const { camelCase } = require('lodash')
const { Agent } = require('http')
const { mix } = require('mixwith')
const mixins = require('../lib/kubernetes-client/mixins')
const WatchBuilder = require('../lib/kubernetes-client/WatchBuilder')
const { PatchType } = require('../lib/kubernetes-client/util')
const { Reflector, Store } = require('../lib/kubernetes-client/cache')
const {
  http: httpSymbols,
  ws: wsSymbols
} = require('../lib/kubernetes-client/symbols')
const { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup, NamespaceScoped, ClusterScoped, Readable, Observable, Cacheable, Writable } = mixins

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

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
      createReflectorStub = sandbox.stub(Reflector, 'create').returns(testReflector)
      createAgentStub = sandbox.stub(TestClient, 'createAgent').returns(testAgent)
      runReflectorSpy = sandbox.spy(testReflector, 'run')
    }

    function beforeEachObservableTest () {
      createReconnectorStub = sandbox.stub(WatchBuilder, 'create').returns(testReconnector)
    }

    describe('Version', function () {
      class V1Object extends V1(Object) {}
      class V1Alpha1Object extends V1Alpha1(Object) {}
      class V1Beta1Object extends V1Beta1(Object) {}

      it('should check that Version mixins do not occur in the inheritance hierarchy', function () {
        expect(new V1Object()).to.have.nested.property('constructor.version', 'v1')
        expect(() => new V1Object() instanceof V1).to.throw(TypeError)
        expect(new V1Alpha1Object()).to.have.nested.property('constructor.version', 'v1alpha1')
        expect(() => new V1Alpha1Object() instanceof V1Alpha1).to.throw(TypeError)
        expect(new V1Beta1Object()).to.have.nested.property('constructor.version', 'v1beta1')
        expect(() => new V1Beta1Object() instanceof V1Beta1).to.throw(TypeError)
      })
    })

    describe('ApiGroup', function () {
      class CoreGroupObject extends CoreGroup(Object) {}
      class NamedGroupObject extends NamedGroup(Object) {}

      it('should check that ApiGroup mixins do not occur in the inheritance hierarchy', function () {
        expect(() => new CoreGroupObject() instanceof CoreGroup).to.throw(TypeError)
        expect(() => new NamedGroupObject() instanceof NamedGroup).to.throw(TypeError)
      })
    })

    describe('ClusterScoped', function () {
      class TestObject extends mix(TestClient).with(ClusterScoped, Readable, Cacheable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', function () {
        const testObject = new TestObject()
        expect(testObject).to.have.nested.property('constructor.scope', 'Cluster')
        expect(testObject).to.be.an.instanceof(ClusterScoped)
        expect(testObject).to.be.an.instanceof(Readable)
        expect(testObject).to.be.an.instanceof(Cacheable)
        expect(testObject).to.be.an.instanceof(Observable)
        expect(testObject).to.be.an.instanceof(Writable)
      })

      describe('Readable', function () {
        it('should get a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('name', {})
          expect(url).to.equal('dummies/name')
          expect(method).to.equal('get')
          expect(searchParams.toString()).to.equal('')
        })

        it('should list a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list({})
          expect(url).to.equal('dummies')
          expect(method).to.equal('get')
          expect(searchParams.toString()).to.equal('')
        })

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('name', { watch: true })
          expect(url).to.equal('dummies')
          expect(method).to.be.undefined
          expect(searchParams.toString()).to.equal('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list({ watch: true })
          expect(url).to.equal('dummies')
          expect(method).to.be.undefined
          expect(searchParams.toString()).to.equal('watch=true')
        })
      })

      describe('Cachable', function () {
        beforeEach(beforeEachCachableTest)

        it('should sync a list of resources', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncList(testStore)
          expect(createReflectorStub).to.be.calledOnce
          const [listWatcher, store] = createReflectorStub.firstCall.args
          expect(store).to.equal(testStore)
          expect(listWatcher.group).to.equal(TestObject.group)
          expect(listWatcher.version).to.equal(TestObject.version)
          expect(listWatcher.names).to.eql(TestObject.names)
          expect(createAgentStub).to.be.calledOnce
          const listStub = sandbox.stub(testObject, 'list')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).to.be.calledTwice
          let listCallArgs
          listCallArgs = listStub.firstCall.args
          expect(listCallArgs.length).to.equal(1)
          expect(listCallArgs[0].agent).to.equal(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).to.be.null
          expect(listCallArgs[0].searchParams.get('foo')).to.equal('bar')
          listCallArgs = listStub.secondCall.args
          expect(listCallArgs.length).to.equal(1)
          expect(listCallArgs[0].agent).to.equal(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).to.equal('true')
          expect(listCallArgs[0].searchParams.get('foo')).to.equal('bar')
          expect(runReflectorSpy).to.be.calledOnce
          expect(reflector).to.equal(testReflector)
        })
      })

      describe('Observable', function () {
        beforeEach(beforeEachObservableTest)

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watch('name', testOptions)
          expect(createReconnectorStub).to.be.calledOnce
          const [object, url, searchParams, name] = createReconnectorStub.firstCall.args
          expect(object).to.equal(testObject)
          expect(url).to.equal('dummies')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(name).to.equal('name')
          expect(reconnector).to.equal(testReconnector)
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchList(testOptions)
          expect(createReconnectorStub).to.be.calledOnce
          const [object, url, searchParams] = createReconnectorStub.firstCall.args
          expect(object).to.equal(testObject)
          expect(url).to.equal('dummies')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(reconnector).to.equal(testReconnector)
        })
      })

      describe('Writable', function () {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('name', testBody, testOptions)
          expect(url).to.equal('dummies/name')
          expect(method).to.equal('patch')
          expect(headers['Content-Type']).to.equal(patchContentType)
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        }

        it('should create a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create(testBody, testOptions)
          expect(url).to.equal('dummies')
          expect(method).to.equal('post')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        })

        it('should update a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('name', testBody, testOptions)
          expect(url).to.equal('dummies/name')
          expect(method).to.equal('put')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        })

        it('should merge patch a resource', function () {
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        it('should strategic merge patch a resource', function () {
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        it('should json patch a resource', function () {
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('name', testOptions)
          expect(url).to.equal('dummies/name')
          expect(method).to.equal('delete')
          expect(searchParams.toString()).to.equal('foo=bar')
        })

        it('should delete multiple resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection(testOptions)
          expect(url).to.equal('dummies')
          expect(method).to.equal('delete')
          expect(searchParams.toString()).to.equal('foo=bar')
        })
      })
    })

    describe('NamespaceScoped', function () {
      class TestObject extends mix(TestClient).with(NamespaceScoped, Readable, Cacheable, Observable, Writable) {}

      it('should check that declared mixins do occur in the inheritance hierarchy', function () {
        const testObject = new TestObject()
        expect(testObject).to.have.nested.property('constructor.scope', 'Namespaced')
        expect(testObject).to.be.an.instanceof(NamespaceScoped)
        expect(testObject).to.be.an.instanceof(Readable)
        expect(testObject).to.be.an.instanceof(Cacheable)
        expect(testObject).to.be.an.instanceof(Observable)
        expect(testObject).to.be.an.instanceof(Writable)
      })

      describe('Readable', function () {
        it('should get a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('namespace', 'name', {})
          expect(url).to.equal('namespaces/namespace/dummies/name')
          expect(method).to.equal('get')
          expect(searchParams.toString()).to.equal('')
        })

        it('should list a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list('namespace', {})
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(method).to.equal('get')
          expect(searchParams.toString()).to.equal('')
        })

        it('should list a resource across all namespaces', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.listAllNamespaces({})
          expect(url).to.equal('dummies')
          expect(method).to.equal('get')
          expect(searchParams.toString()).to.equal('')
        })

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.get('namespace', 'name', { watch: true })
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(method).to.be.undefined
          expect(searchParams.toString()).to.equal('watch=true&fieldSelector=metadata.name%3Dname')
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.list('namespace', { watch: true })
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(method).to.be.undefined
          expect(searchParams.toString()).to.equal('watch=true')
        })

        it('should watch a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.listAllNamespaces({ watch: true })
          expect(url).to.equal('dummies')
          expect(method).to.be.undefined
          expect(searchParams.toString()).to.equal('watch=true')
        })
      })

      describe('Cachable', function () {
        beforeEach(beforeEachCachableTest)

        it('should sync a list of resources', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncList('namesace', testStore)
          expect(createReflectorStub).to.be.calledOnce
          const [listWatcher, store] = createReflectorStub.firstCall.args
          expect(store).to.equal(testStore)
          expect(listWatcher.group).to.equal(TestObject.group)
          expect(listWatcher.version).to.equal(TestObject.version)
          expect(listWatcher.names).to.eql(TestObject.names)
          expect(createAgentStub).to.be.calledOnce
          const listStub = sandbox.stub(testObject, 'list')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).to.be.calledTwice
          let listCallArgs
          listCallArgs = listStub.firstCall.args
          expect(listCallArgs.length).to.equal(2)
          expect(listCallArgs[0]).to.equal('namesace')
          expect(listCallArgs[1].agent).to.equal(testAgent)
          expect(listCallArgs[1].searchParams.get('watch')).to.be.null
          expect(listCallArgs[1].searchParams.get('foo')).to.equal('bar')
          listCallArgs = listStub.secondCall.args
          expect(listCallArgs.length).to.equal(2)
          expect(listCallArgs[0]).to.equal('namesace')
          expect(listCallArgs[1].agent).to.equal(testAgent)
          expect(listCallArgs[1].searchParams.get('watch')).to.equal('true')
          expect(listCallArgs[1].searchParams.get('foo')).to.equal('bar')
          expect(runReflectorSpy).to.be.calledOnce
          expect(reflector).to.equal(testReflector)
        })

        it('should sync a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const reflector = testObject.syncListAllNamespaces(testStore)
          expect(createReflectorStub).to.be.calledOnce
          const [listWatcher, store] = createReflectorStub.firstCall.args
          expect(store).to.equal(testStore)
          expect(listWatcher.group).to.equal(TestObject.group)
          expect(listWatcher.version).to.equal(TestObject.version)
          expect(listWatcher.names).to.eql(TestObject.names)
          expect(createAgentStub).to.be.calledOnce
          const listStub = sandbox.stub(testObject, 'listAllNamespaces')
          listWatcher.list(testOptions)
          listWatcher.watch(testOptions)
          expect(listStub).to.be.calledTwice
          let listCallArgs
          listCallArgs = listStub.firstCall.args
          expect(listCallArgs.length).to.equal(1)
          expect(listCallArgs[0].agent).to.equal(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).to.be.null
          expect(listCallArgs[0].searchParams.get('foo')).to.equal('bar')
          listCallArgs = listStub.secondCall.args
          expect(listCallArgs.length).to.equal(1)
          expect(listCallArgs[0].agent).to.equal(testAgent)
          expect(listCallArgs[0].searchParams.get('watch')).to.equal('true')
          expect(listCallArgs[0].searchParams.get('foo')).to.equal('bar')
          expect(runReflectorSpy).to.be.calledOnce
          expect(reflector).to.equal(testReflector)
        })
      })

      describe('Observable', function () {
        beforeEach(beforeEachObservableTest)

        it('should watch a resource', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watch('namespace', 'name', testOptions)
          expect(createReconnectorStub).to.be.calledOnce
          const [object, url, searchParams, name] = createReconnectorStub.firstCall.args
          expect(object).to.equal(testObject)
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(name).to.equal('name')
          expect(reconnector).to.equal(testReconnector)
        })

        it('should watch a list of resources', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchList('namespace', testOptions)
          expect(createReconnectorStub).to.be.calledOnce
          const [object, url, searchParams] = createReconnectorStub.firstCall.args
          expect(object).to.equal(testObject)
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(reconnector).to.equal(testReconnector)
        })

        it('should watch a list of resources across all namespaces', function () {
          const testObject = new TestObject()
          const reconnector = testObject.watchListAllNamespaces(testOptions)
          expect(createReconnectorStub).to.be.calledOnce
          const [object, url, searchParams] = createReconnectorStub.firstCall.args
          expect(object).to.equal(testObject)
          expect(url).to.equal('dummies')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(reconnector).to.equal(testReconnector)
        })
      })

      describe('Writable', function () {
        function patchMethodTest (patchType, testBody) {
          const testObject = new TestObject()
          const patchMethod = camelCase(patchType) + 'Patch'
          const patchContentType = 'application/' + patchType + '-patch+json'
          const [url, { method, searchParams, headers, json }] = testObject[patchMethod]('namespace', 'name', testBody, testOptions)
          expect(url).to.equal('namespaces/namespace/dummies/name')
          expect(method).to.equal('patch')
          expect(headers['Content-Type']).to.equal(patchContentType)
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        }

        it('should create a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.create('namespace', testBody, testOptions)
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(method).to.equal('post')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        })

        it('should update a resource', function () {
          const testObject = new TestObject()
          const testBody = { bar: 'foo' }
          const [url, { method, searchParams, json }] = testObject.update('namespace', 'name', testBody, testOptions)
          expect(url).to.equal('namespaces/namespace/dummies/name')
          expect(method).to.equal('put')
          expect(searchParams.toString()).to.equal('foo=bar')
          expect(json).to.equal(testBody)
        })

        it('should merge patch a resource', function () {
          patchMethodTest(PatchType.MERGE, { bar: 'foo' })
        })

        it('should strategic merge patch a resource', function () {
          patchMethodTest(PatchType.STRATEGIC_MERGE, { bar: 'foo' })
        })

        it('should json patch a resource', function () {
          patchMethodTest(PatchType.JSON, ['foo'])
        })

        it('should delete a resource', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.delete('namespace', 'name', testOptions)
          expect(url).to.equal('namespaces/namespace/dummies/name')
          expect(method).to.equal('delete')
          expect(searchParams.toString()).to.equal('foo=bar')
        })

        it('should delete multiple resources', function () {
          const testObject = new TestObject()
          const [url, { method, searchParams }] = testObject.deleteCollection('namespace', testOptions)
          expect(url).to.equal('namespaces/namespace/dummies')
          expect(method).to.equal('delete')
          expect(searchParams.toString()).to.equal('foo=bar')
        })
      })
    })
  })
})
