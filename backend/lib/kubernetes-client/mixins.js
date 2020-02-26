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

const { isPlainObject, isEmpty } = require('lodash')
const { join } = require('path')
const { Mixin } = require('mixwith')

const WatchBuilder = require('./WatchBuilder')
const { Reflector } = require('./cache')
const { http, ws } = require('./symbols')
const { Store } = require('./cache')
const { clusterScopedUrl, namespaceScopedUrl, setPatchType, PatchType } = require('./util')

// Plain subclass factories without deduplication, caching and instanceof support
const V1Alpha1 = superclass => class extends superclass {
  static get version () {
    return 'v1alpha1'
  }
}

const V1Beta1 = superclass => class extends superclass {
  static get version () {
    return 'v1beta1'
  }
}

const V1 = superclass => class extends superclass {
  static get version () {
    return 'v1'
  }
}

const CoreGroup = superclass => class extends superclass {
  [http.prefixUrl] (url) {
    return new URL(join('api', this.constructor.version), url).toString()
  }
}

const NamedGroup = superclass => class extends superclass {
  [http.prefixUrl] (url) {
    return new URL(join('apis', this.constructor.group, this.constructor.version), url).toString()
  }
}

// Wrapped subclass factories with deduplication, caching and instanceof support  (https://github.com/justinfagnani/mixwith.js#defining-mixins)
const NamespaceScoped = Mixin(superclass => class extends superclass {
  static get scope () {
    return 'Namespaced'
  }
})

const ClusterScoped = Mixin(superclass => class extends superclass {
  static get scope () {
    return 'Cluster'
  }
})

ClusterScoped.Readable = superclass => class extends superclass {
  get (name, { watch, ...options } = {}) {
    assertName(name)
    assertOptions(options)
    let url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    if (watch === true) {
      searchParams.set('watch', true)
      addFieldSelector(searchParams, 'metadata.name', name)
      url = clusterScopedUrl(this.constructor.names)
      return this[ws.connect](url, { searchParams })
    }
    return this[http.request](url, { method: 'get', searchParams })
  }

  list ({ watch, ...options } = {}) {
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    if (watch === true) {
      searchParams.set('watch', true)
      return this[ws.connect](url, { searchParams })
    }
    return this[http.request](url, { method: 'get', searchParams })
  }
}

NamespaceScoped.Readable = superclass => class extends superclass {
  get (namespace, name, { watch, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertOptions(options)
    let url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    if (watch === true) {
      searchParams.set('watch', true)
      addFieldSelector(searchParams, 'metadata.name', name)
      url = namespaceScopedUrl(this.constructor.names, namespace)
      return this[ws.connect](url, { searchParams })
    }
    return this[http.request](url, { method: 'get', searchParams })
  }

  list (namespace, { watch, ...options } = {}) {
    assertNamespace(namespace)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    const searchParams = new URLSearchParams(options)
    if (watch === true) {
      searchParams.set('watch', true)
      return this[ws.connect](url, { searchParams })
    }
    return this[http.request](url, { method: 'get', searchParams })
  }

  listAllNamespaces ({ watch, ...options } = {}) {
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    if (watch === true) {
      searchParams.set('watch', true)
      return this[ws.connect](url, { searchParams })
    }
    return this[http.request](url, { method: 'get', searchParams })
  }
}

ClusterScoped.Observable = superclass => class extends superclass {
  watch (name, options) {
    assertName(name)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    return WatchBuilder.create(this, url, searchParams, name)
  }

  watchList (options) {
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    return WatchBuilder.create(this, url, searchParams)
  }
}

ClusterScoped.Cacheable = superclass => class extends superclass {
  syncList (store) {
    assertStore(store)
    const { group, version, names } = this.constructor
    const listWatcher = {
      group,
      version,
      names,
      list: options => this.list(options),
      watch: options => this.list({ watch: true, ...options })
    }
    const reflector = Reflector.create(listWatcher, store)
    reflector.run()
    return reflector
  }
}

NamespaceScoped.Cacheable = superclass => class extends superclass {
  syncList (namespace, store) {
    assertNamespace(namespace)
    assertStore(store)
    const { group, version, names } = this.constructor
    const listWatcher = {
      group,
      version,
      names,
      list: options => this.list(namespace, options),
      watch: options => this.list(namespace, { watch: true, ...options })
    }
    const reflector = Reflector.create(listWatcher, store)
    reflector.run()
    return reflector
  }

  syncListAllNamespaces (store) {
    assertStore(store)
    const { group, version, names } = this.constructor
    const listWatcher = {
      group,
      version,
      names,
      list: options => this.listAllNamespaces(options),
      watch: options => this.listAllNamespaces({ watch: true, ...options })
    }
    const reflector = Reflector.create(listWatcher, store)
    reflector.run()
    return reflector
  }
}

NamespaceScoped.Observable = superclass => class extends superclass {
  watch (namespace, name, options) {
    assertNamespace(namespace)
    assertName(name)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    const searchParams = new URLSearchParams(options)
    return WatchBuilder.create(this, url, searchParams, name)
  }

  watchList (namespace, options) {
    assertNamespace(namespace)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    const searchParams = new URLSearchParams(options)
    return WatchBuilder.create(this, url, searchParams)
  }

  watchListAllNamespaces (options) {
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    return WatchBuilder.create(this, url, searchParams)
  }
}

ClusterScoped.Creatable = superclass => class extends superclass {
  create (body, options) {
    assertBodyObject(body)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'post', searchParams, json: body })
  }
}

NamespaceScoped.Creatable = superclass => class extends superclass {
  create (namespace, body, options) {
    assertNamespace(namespace)
    assertBodyObject(body)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'post', searchParams, json: body })
  }
}

ClusterScoped.Writable = superclass => class extends ClusterScoped.Creatable(superclass) {
  update (name, body, options) {
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'put', searchParams, json: body })
  }

  mergePatch (name, body, options) {
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.MERGE))
  }

  jsonPatch (name, body, options) {
    assertName(name)
    assertBodyArray(body)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.JSON))
  }

  strategicMergePatch (name, body, options) {
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.STRATEGIC_MERGE))
  }

  delete (name, options) {
    assertName(name)
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'delete', searchParams })
  }

  deleteCollection (options) {
    assertOptions(options)
    const url = clusterScopedUrl(this.constructor.names)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'delete', searchParams })
  }
}

NamespaceScoped.Writable = superclass => class extends NamespaceScoped.Creatable(superclass) {
  update (namespace, name, body, options) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'put', searchParams, json: body })
  }

  mergePatch (namespace, name, body, options) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.MERGE))
  }

  jsonPatch (namespace, name, body, options) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyArray(body)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.JSON))
  }

  strategicMergePatch (namespace, name, body, options) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyObject(body)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, setPatchType({ method: 'patch', searchParams, json: body }, PatchType.STRATEGIC_MERGE))
  }

  delete (namespace, name, options) {
    assertNamespace(namespace)
    assertName(name)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'delete', searchParams })
  }

  deleteCollection (namespace, options) {
    assertNamespace(namespace)
    assertOptions(options)
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    const searchParams = new URLSearchParams(options)
    return this[http.request](url, { method: 'delete', searchParams })
  }
}

const Readable = Mixin(superclass => {
  switch (superclass.scope) {
    case 'Cluster':
      return ClusterScoped.Readable(superclass)
    case 'Namespaced':
      return NamespaceScoped.Readable(superclass)
    default:
      throw new TypeError('The resource scope must be one of ["Namespaced", "Cluster"]')
  }
})

const Cacheable = Mixin(superclass => {
  switch (superclass.scope) {
    case 'Cluster':
      return ClusterScoped.Cacheable(superclass)
    case 'Namespaced':
      return NamespaceScoped.Cacheable(superclass)
    default:
      throw new TypeError('The resource scope must be one of ["Namespaced", "Cluster"]')
  }
})

const Observable = Mixin(superclass => {
  switch (superclass.scope) {
    case 'Cluster':
      return ClusterScoped.Observable(superclass)
    case 'Namespaced':
      return NamespaceScoped.Observable(superclass)
    default:
      throw new TypeError('The resource scope must be one of ["Namespaced", "Cluster"]')
  }
})

const Creatable = Mixin(superclass => {
  switch (superclass.scope) {
    case 'Cluster':
      return ClusterScoped.Creatable(superclass)
    case 'Namespaced':
      return NamespaceScoped.Creatable(superclass)
    default:
      throw new TypeError('The resource scope must be one of ["Namespaced", "Cluster"]')
  }
})

const Writable = Mixin(superclass => {
  switch (superclass.scope) {
    case 'Cluster':
      return ClusterScoped.Writable(superclass)
    case 'Namespaced':
      return NamespaceScoped.Writable(superclass)
    default:
      throw new TypeError('The resource scope must be one of ["Namespaced", "Cluster"]')
  }
})

function assertOptions (options) {
  if (options && !isPlainObject(options)) {
    throw new TypeError('The parameter "options" must be empty or a plain object')
  }
}

function assertNamespace (namespace) {
  if (typeof namespace !== 'string' || !namespace) {
    throw new TypeError('The parameter "namespace" must be a string')
  }
}

function assertName (name) {
  if (typeof name !== 'string' || !name) {
    throw new TypeError('The parameter "name" must be a string')
  }
}

function assertStore (store) {
  if (!store || !(store instanceof Store)) {
    throw new TypeError('The parameter "store" must be instance of Store')
  }
}

function assertBodyObject (body) {
  if (!isPlainObject(body) || isEmpty(body)) {
    throw new TypeError('The parameter "body" must be a non empty plain object')
  }
}

function assertBodyArray (body) {
  if (!Array.isArray(body) || isEmpty(body)) {
    throw new TypeError('The parameter "body" must be a non empty array')
  }
}

function addFieldSelector (searchParams, key, value) {
  let fieldSelector = key + '=' + value
  if (searchParams.has('fieldSelector')) {
    fieldSelector += ',' + searchParams.get('fieldSelector')
  }
  searchParams.set('fieldSelector', fieldSelector)
}

module.exports = {
  V1,
  V1Alpha1,
  V1Beta1,
  CoreGroup,
  NamedGroup,
  ClusterScoped,
  NamespaceScoped,
  Readable,
  Cacheable,
  Observable,
  Creatable,
  Writable
}
