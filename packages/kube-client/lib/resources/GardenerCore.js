//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { GardenerCore } = require('../groups')
const { NamespaceScoped, ClusterScoped, Readable, Writable, Observable, Cacheable } = require('../mixins')

class Project extends mix(GardenerCore).with(ClusterScoped, Readable, Cacheable, Observable, Writable) {
  static get names () {
    return {
      plural: 'projects',
      singular: 'project',
      kind: 'Project'
    }
  }
}

class CloudProfile extends mix(GardenerCore).with(ClusterScoped, Readable, Cacheable, Observable) {
  static get names () {
    return {
      plural: 'cloudprofiles',
      singular: 'cloudprofile',
      kind: 'CloudProfile'
    }
  }
}

class Seed extends mix(GardenerCore).with(ClusterScoped, Readable, Cacheable, Observable) {
  static get names () {
    return {
      plural: 'seeds',
      singular: 'seed',
      kind: 'Seed'
    }
  }
}

class Quota extends mix(GardenerCore).with(NamespaceScoped, Readable, Cacheable, Observable) {
  static get names () {
    return {
      plural: 'quotas',
      singular: 'quota',
      kind: 'Quota'
    }
  }
}

class SecretBinding extends mix(GardenerCore).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'secretbindings',
      singular: 'secretbinding',
      kind: 'SecretBinding'
    }
  }
}

class Shoot extends mix(GardenerCore).with(NamespaceScoped, Readable, Cacheable, Observable, Writable) {
  static get names () {
    return {
      plural: 'shoots',
      singular: 'shoot',
      kind: 'Shoot'
    }
  }
}

module.exports = {
  CloudProfile,
  Project,
  Quota,
  SecretBinding,
  Seed,
  Shoot
}
