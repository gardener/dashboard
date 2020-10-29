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

const Member = require('./Member')

class SubjectListItem {
  constructor (index = -1) {
    this.index = index
    this.extensions = {}
  }

  get kind () {
    return _.startsWith(this.id, 'system:serviceaccount:')
      ? 'ServiceAccount'
      : 'User'
  }

  get active () {
    return this.index >= 0
  }

  get member () {
    return new Member(this.id, this)
  }

  extend (obj) {
    _.assign(this.extensions, obj)
  }

  static create (firstArg, ...rest) {
    if (Array.isArray(firstArg)) {
      return new SubjectListItemGroup(firstArg)
    } else if (typeof firstArg === 'string') {
      const subject = Member.parseUsername(firstArg)
      return new SubjectListItemUniq(subject, ...rest)
    }
    return new SubjectListItemUniq(firstArg, ...rest)
  }
}

class SubjectListItemUniq extends SubjectListItem {
  constructor (subject, index) {
    super(index)
    this.subject = subject
  }

  get id () {
    const { kind, name, namespace } = this.subject
    return kind === 'ServiceAccount'
      ? `system:serviceaccount:${namespace}:${name}`
      : name
  }

  get roles () {
    const { role, roles } = this.subject
    return _
      .chain([])
      .concat(role, roles)
      .compact()
      .uniq()
      .value()
  }

  set roles ([role, ...roles] = []) {
    if (this.kind === 'ServiceAccount') {
      if (!role) {
        this.index = -1
      } else if (this.index < 0) {
        this.index = Number.MAX_SAFE_INTEGER
      }
    }
    this.subject.role = role
    this.subject.roles = _
      .chain(roles)
      .compact()
      .uniq()
      .value()
    if (_.isEmpty(this.subject.roles)) {
      delete this.subject.roles
    }
  }
}

class SubjectListItemGroup extends SubjectListItem {
  constructor (items) {
    const index = _
      .chain(items)
      .map('index')
      .min()
      .value()
    super(index)
    this.items = items
  }

  get id () {
    return _
      .chain(this.items)
      .head()
      .get('id')
      .value()
  }

  get roles () {
    return _
      .chain(this.items)
      .flatMap('roles')
      .uniq()
      .value()
  }

  set roles (roles = []) {
    const diff = {
      del: _.difference(this.roles, roles),
      add: _.difference(roles, this.roles)
    }
    const deleteRoles = item => {
      item.roles = _.difference(item.roles, diff.del)
    }
    const addRoles = ([item]) => {
      item.roles = _
        .chain(item.roles)
        .concat(diff.add)
        .compact()
        .uniq()
        .value()
    }
    this.items = _
      .chain(this.items)
      .tap(addRoles)
      .forEach(deleteRoles)
      .filter('roles.length')
      .value()
  }
}

module.exports = SubjectListItem
