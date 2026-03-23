//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { GardenerCore } from '../groups.js'
import { NamespaceScoped, ClusterScoped, Readable, Writable, Observable } from '../mixins.js'

class Project extends mix(GardenerCore).with(ClusterScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'projects',
      singular: 'project',
      kind: 'Project',
    }
  }
}

class CloudProfile extends mix(GardenerCore).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'cloudprofiles',
      singular: 'cloudprofile',
      kind: 'CloudProfile',
    }
  }
}

class NamespacedCloudProfile extends mix(GardenerCore).with(NamespaceScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'namespacedcloudprofiles',
      singular: 'namespacedcloudprofile',
      kind: 'NamespacedCloudProfile',
    }
  }
}

class Seed extends mix(GardenerCore).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'seeds',
      singular: 'seed',
      kind: 'Seed',
    }
  }
}

class Quota extends mix(GardenerCore).with(NamespaceScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'quotas',
      singular: 'quota',
      kind: 'Quota',
    }
  }
}

class SecretBinding extends mix(GardenerCore).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'secretbindings',
      singular: 'secretbinding',
      kind: 'SecretBinding',
    }
  }
}

export class Shoot extends mix(GardenerCore).with(NamespaceScoped, Readable, Observable, Writable) {
  createAdminKubeconfigRequest (namespace, name, body, options) {
    return this.create([namespace, name, 'adminkubeconfig'], body, options)
  }

  static get names () {
    return {
      plural: 'shoots',
      singular: 'shoot',
      kind: 'Shoot',
    }
  }
}

class ControllerRegistration extends mix(GardenerCore).with(ClusterScoped, Readable, Observable) {
  static get names () {
    return {
      plural: 'controllerregistrations',
      singular: 'controllerregistration',
      kind: 'ControllerRegistration',
    }
  }
}

export default {
  CloudProfile,
  NamespacedCloudProfile,
  Project,
  Quota,
  SecretBinding,
  Seed,
  Shoot,
  ControllerRegistration,
}
