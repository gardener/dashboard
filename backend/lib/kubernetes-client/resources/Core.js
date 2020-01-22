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
