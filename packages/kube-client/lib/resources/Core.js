//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { Core } from '../groups.js'
import { NamespaceScoped, ClusterScoped, Readable, Writable, Observable } from '../mixins.js'

class Endpoints extends mix(Core).with(NamespaceScoped, Readable, Writable) {
  static get names () {
    return {
      plural: 'endpoints',
      singular: '',
      kind: 'Endpoints',
    }
  }
}

class Namespace extends mix(Core).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'namespaces',
      singular: 'namespace',
      kind: 'Namespace',
    }
  }
}

class Node extends mix(Core).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'nodes',
      singular: 'node',
      kind: 'Node',
    }
  }
}

class Pod extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'pods',
      singular: 'pod',
      kind: 'Pod',
    }
  }
}

class ConfigMap extends mix(Core).with(NamespaceScoped, Readable) {
  static get names () {
    return {
      plural: 'configmaps',
      singular: 'configmap',
      kind: 'ConfigMap',
    }
  }
}

class Secret extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'secrets',
      singular: 'secret',
      kind: 'Secret',
    }
  }
}

class Service extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'services',
      singular: 'service',
      kind: 'Service',
    }
  }
}

class ServiceAccount extends mix(Core).with(NamespaceScoped, Readable, Observable, Writable) {
  createTokenRequest (namespace, name, body, options) {
    return this.create([namespace, name, 'token'], body, options)
  }

  static get names () {
    return {
      plural: 'serviceaccounts',
      singular: 'serviceaccount',
      kind: 'ServiceAccount',
    }
  }
}

class ResourceQuota extends mix(Core).with(NamespaceScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'resourcequotas',
      singular: 'resourcequota',
      kind: 'ResourceQuota',
    }
  }
}

export default {
  Endpoints,
  Namespace,
  Node,
  Pod,
  ConfigMap,
  Secret,
  Service,
  ServiceAccount,
  ResourceQuota,
}
