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
