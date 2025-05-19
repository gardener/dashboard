//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { mix } from 'mixwith'
import * as mixins from '../lib/mixins.js'
import { http } from '../lib/symbols.js'
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
      kind: 'Foo',
    }
  }
}

class Bar extends mix(MockGroup).with(ClusterScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'bars',
      singular: 'bar',
      kind: 'Bar',
    }
  }
}

export {
  Foo,
  Bar,
}
