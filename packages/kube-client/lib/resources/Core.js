//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { Core } = require('../groups')
const { NamespaceScoped, ClusterScoped, Readable, Writable, Observable } = require('../mixins')

class Endpoints extends mix(Core).with(NamespaceScoped, Readable, Writable) {
  static get names () {
    return {
      plural: 'endpoints',
      singular: '',
      kind: 'Endpoints'
    }
  }
}

class Namespace extends mix(Core).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'namespaces',
      singular: 'namespace',
      kind: 'Namespace'
    }
  }
}

class Node extends mix(Core).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'nodes',
      singular: 'node',
      kind: 'Node'
    }
  }
}

class Pod extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'pods',
      singular: 'pod',
      kind: 'Pod'
    }
  }
}

class ConfigMap extends mix(Core).with(NamespaceScoped, Readable) {
  static get names () {
    return {
      plural: 'configmaps',
      singular: 'configmap',
      kind: 'ConfigMap'
    }
  }
}

class Secret extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'secrets',
      singular: 'secret',
      kind: 'Secret'
    }
  }
}

class Service extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'services',
      singular: 'service',
      kind: 'Service'
    }
  }
}

class ServiceAccount extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'serviceaccounts',
      singular: 'serviceaccount',
      kind: 'ServiceAccount'
    }
  }
}

module.exports = {
  Endpoints,
  Namespace,
  Node,
  Pod,
  ConfigMap,
  Secret,
  Service,
  ServiceAccount
}
