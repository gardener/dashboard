//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import Member from './Member.js'

const allowedExtensionProperties = Object.freeze([
  ...Member.allowedExtensionProperties,
  'secrets',
])

class SubjectListItem {
  constructor (index = SubjectListItem.NOT_IN_LIST) {
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
    const before = _.cloneDeep(this.extensions)
    const after = _.assign(this.extensions, _.pick(obj, allowedExtensionProperties))
    return !_.isEqual(before, after)
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

Object.assign(SubjectListItem, {
  NOT_IN_LIST: -1,
  END_OF_LIST: Number.MAX_SAFE_INTEGER,
})

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
        this.index = SubjectListItem.NOT_IN_LIST
      } else if (this.index < 0) {
        this.index = SubjectListItem.END_OF_LIST
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
      .get(['id'])
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
      add: _.difference(roles, this.roles),
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

export default SubjectListItem
