//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { isPlainObject, isEmpty } from 'lodash-es'
import { join } from 'path'
import { Mixin } from 'mixwith'
import { Informer, ListWatcher } from './cache/index.js'
import { http } from './symbols.js'
import { clusterScopedUrl, namespaceScopedUrl, validateLabelValue, setPatchType, PatchType } from './util.js'

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
  static get [http.relativeUrl] () {
    return join('api', this.version)
  }
}

const NamedGroup = superclass => class extends superclass {
  static get [http.relativeUrl] () {
    return join('apis', this.group, this.version)
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
  get (name, { searchParams, signal, ...options } = {}) {
    assertName(name)
    assertSearchParams(searchParams)
    assertOptions(options)
    const method = 'get'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams })
  }

  list ({ searchParams, signal, ...options } = {}) {
    assertSearchParams(searchParams)
    assertOptions(options)
    const method = 'get'
    const url = clusterScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams })
  }
}

NamespaceScoped.Readable = superclass => class extends superclass {
  get (namespace, name, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertSearchParams(searchParams)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams })
  }

  list (namespace, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertSearchParams(searchParams)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams })
  }

  listAllNamespaces ({ searchParams, signal, ...options } = {}) {
    assertSearchParams(searchParams)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams })
  }
}

ClusterScoped.Observable = superclass => class extends superclass {
  watch (name, { searchParams, signal, condition, ...options } = {}) {
    assertName(name)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'get'
    const url = clusterScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    searchParams.set('watch', true)
    addFieldSelector(searchParams, 'metadata.name', name)
    return this[http.stream](url, { method, searchParams, signal })
  }

  watchList ({ searchParams, signal, ...options } = {}) {
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'get'
    const url = clusterScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    searchParams.set('watch', true)
    return this[http.stream](url, { method, searchParams, signal })
  }

  informer (options) {
    // create ListWatcher
    const listFunc = options => this.list(options)
    const watchFunc = options => this.watchList(options)
    const listWatcher = new ListWatcher(listFunc, watchFunc, this.constructor, options)
    // create informer
    return Informer.create(listWatcher)
  }
}

NamespaceScoped.Observable = superclass => class extends superclass {
  watch (namespace, name, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    searchParams = normalizeSearchParams(method, searchParams, options)
    searchParams.set('watch', true)
    addFieldSelector(searchParams, 'metadata.name', name)
    return this[http.stream](url, { method, searchParams, signal })
  }

  watchList (namespace, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    searchParams = normalizeSearchParams(method, searchParams, options)
    searchParams.set('watch', true)
    return this[http.stream](url, { method, searchParams, signal })
  }

  watchListAllNamespaces ({ searchParams, signal, ...options } = {}) {
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'get'
    const url = namespaceScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    searchParams.set('watch', true)
    return this[http.stream](url, { method, searchParams, signal })
  }

  informer (namespace, options) {
    assertNamespace(namespace)
    // create ListWatcher
    const listFunc = options => this.list(namespace, options)
    const watchFunc = options => this.watchList(namespace, options)
    const listWatcher = new ListWatcher(listFunc, watchFunc, this.constructor, options)
    // create informer
    return Informer.create(listWatcher)
  }

  informerAllNamespaces (options) {
    // create ListWatcher
    const listFunc = options => this.listAllNamespaces(options)
    const watchFunc = options => this.watchListAllNamespaces(options)
    const listWatcher = new ListWatcher(listFunc, watchFunc, this.constructor, options)
    // create informer
    return Informer.create(listWatcher)
  }
}

ClusterScoped.Creatable = superclass => class extends superclass {
  create (body, { searchParams, signal, onWarning, ...options } = {}) {
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'post'
    const url = clusterScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, json: body, signal, onWarning })
  }
}

NamespaceScoped.Creatable = superclass => class extends superclass {
  create (namespace, body, { searchParams, signal, onWarning, ...options } = {}) {
    let name
    if (Array.isArray(namespace)) {
      name = namespace[1]
      assertName(name)
      name = [name, namespace[2]]
      namespace = namespace[0]
    }
    assertNamespace(namespace)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'post'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, json: body, signal, onWarning })
  }
}

ClusterScoped.Writable = superclass => class extends ClusterScoped.Creatable(superclass) {
  update (name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertName(name)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'put'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, json: body, signal, onWarning })
  }

  mergePatch (name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertName(name)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.MERGE))
  }

  jsonPatch (name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertName(name)
    assertBodyArray(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.JSON))
  }

  strategicMergePatch (name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertName(name)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.STRATEGIC_MERGE))
  }

  delete (name, { searchParams, signal, ...options } = {}) {
    assertName(name)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'delete'
    const url = clusterScopedUrl(this.constructor.names, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, signal })
  }

  deleteCollection ({ searchParams, signal, ...options } = {}) {
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'delete'
    const url = clusterScopedUrl(this.constructor.names)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, signal })
  }
}

NamespaceScoped.Writable = superclass => class extends NamespaceScoped.Creatable(superclass) {
  update (namespace, name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'put'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method: 'put', searchParams, json: body, signal, onWarning })
  }

  mergePatch (namespace, name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertName(name)
    assertNamespace(namespace)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.MERGE))
  }

  jsonPatch (namespace, name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyArray(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.JSON))
  }

  strategicMergePatch (namespace, name, body, { searchParams, signal, onWarning, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertBodyObject(body)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'patch'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, setPatchType({ method, searchParams, json: body, signal, onWarning }, PatchType.STRATEGIC_MERGE))
  }

  delete (namespace, name, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertName(name)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'delete'
    const url = namespaceScopedUrl(this.constructor.names, namespace, name)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, signal })
  }

  deleteCollection (namespace, { searchParams, signal, ...options } = {}) {
    assertNamespace(namespace)
    assertSearchParams(searchParams)
    assertSignal(signal)
    assertOptions(options)
    const method = 'delete'
    const url = namespaceScopedUrl(this.constructor.names, namespace)
    searchParams = normalizeSearchParams(method, searchParams, options)
    return this[http.request](url, { method, searchParams, signal })
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
  if (Array.isArray(name)) {
    name = name[0]
  }
  if (typeof name !== 'string' || !name) {
    throw new TypeError('The parameter "name" must be a string or an array of strings')
  }
}

function assertSignal (signal) {
  if (signal && !(signal instanceof AbortSignal)) {
    throw new TypeError('The parameter "signal" must be empty or an instance of AbortSignal')
  }
}

function assertSearchParams (searchParams) {
  if (searchParams && !(searchParams instanceof URLSearchParams)) {
    throw new TypeError('The parameter "searchParams" must be empty or an instance of URLSearchParams')
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

function addFieldSelector (searchParams, key, value, operator = '=') {
  validateLabelValue(value)
  let fieldSelector = [key, value].join(operator)
  if (searchParams.has('fieldSelector')) {
    fieldSelector += ',' + searchParams.get('fieldSelector')
  }
  searchParams.set('fieldSelector', fieldSelector)
}

const allowedSearchParamsMap = new Map(Object.entries({
  get: [
    'watch',
    'limit',
    'continue',
    'fieldSelector',
    'labelSelector',
    'resourceVersion',
    'timeoutSeconds',
    'includeUninitialized',
    'allowWatchBookmarks',
    'pretty',
  ],
  post: [
    'pretty',
    'dryRun',
  ],
  put: [
    'fieldManager',
    'pretty',
    'dryRun',
  ],
  patch: [
    'fieldManager',
    'pretty',
    'dryRun',
  ],
  delete: [
    'gracePeriodSeconds',
    'orphanDependents',
    'propagationPolicy',
    'pretty',
    'dryRun',
  ],
}))

function normalizeSearchParams (method, searchParams, options) {
  const normalizedSearchParams = new URLSearchParams()
  const allowedSearchParams = allowedSearchParamsMap.get(method)
  try {
    searchParams ??= Object.entries(options)
    for (const [key, value] of searchParams) {
      if (allowedSearchParams.includes(key)) {
        normalizedSearchParams.set(key, value)
      }
    }
  } catch (err) {
    return null
  }
  return normalizedSearchParams
}

export {
  V1,
  V1Alpha1,
  V1Beta1,
  CoreGroup,
  NamedGroup,
  ClusterScoped,
  NamespaceScoped,
  Readable,
  Observable,
  Creatable,
  Writable,
}
