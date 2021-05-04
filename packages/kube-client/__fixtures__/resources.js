//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')
const mixins = require('../lib/mixins')
const { http } = require('../lib/symbols')
const { V1, NamedGroup, NamespaceScoped, ClusterScoped, Readable, Observable, Writable } = mixins

class MockClient {
  constructor () {
    this[http.request] = jest.fn()
    this[http.stream] = jest.fn()
  }

  get request () {
    return this[http.request]
  }

  get stream () {
    return this[http.stream]
  }
}

class MockGroup extends V1(NamedGroup(MockClient)) {
  static get group () {
    return 'group'
  }
}

class Foo extends mix(MockGroup).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'foos',
      singular: 'foo',
      kind: 'Foo'
    }
  }
}

class Bar extends mix(MockGroup).with(ClusterScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'bars',
      singular: 'bar',
      kind: 'Bar'
    }
  }
}

module.exports = {
  Foo,
  Bar
}
