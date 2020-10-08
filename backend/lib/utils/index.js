
//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const _ = require('lodash')
const config = require('../config')
const assert = require('assert').strict

function decodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'utf8').toString('base64')
}

function getConfigValue (path, defaultValue) {
  const value = _.get(config, path, defaultValue)
  if (arguments.length === 1 && typeof value === 'undefined') {
    assert.fail(`no config with ${path} found`)
  }
  return value
}

function getSeedNameFromShoot ({ spec = {} }) {
  const seed = spec.seedName
  assert.ok(seed, 'There is no seed assigned to this shoot (yet)')
  return seed
}

function shootHasIssue (shoot) {
  return _.get(shoot, ['metadata', 'labels', 'shoot.gardener.cloud/status'], 'healthy') !== 'healthy'
}

function joinMemberRoleAndRoles (role, roles) {
  if (roles) {
    // uniq to also support test scenarios, gardener discards duplicate roles
    return _.uniq([role, ...roles])
  }
  return [role]
}

function splitMemberRolesIntoRoleAndRoles (roles) {
  const role = _.head(roles) // do not shift role, gardener ignores duplicate role in roles array and will remove role field in future API version
  return { role, roles }
}

function parseUsernameToMember(username) {
  if (!username) {
    return undefined
  }
  const [, namespace, name] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
  if (name && namespace) {
    return {
      kind: 'ServiceAccount',
      name,
      namespace
    }
  }
  return {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name: username
  }
}

module.exports = {
  decodeBase64,
  encodeBase64,
  getConfigValue,
  getSeedNameFromShoot,
  shootHasIssue,
  joinMemberRoleAndRoles,
  splitMemberRolesIntoRoleAndRoles,
  parseUsernameToMember
}
