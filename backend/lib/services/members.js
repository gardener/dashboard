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
const { decodeBase64 } = require('../utils')
const { dumpKubeconfig } = require('@gardener-dashboard/kube-config')
const { NotFound, Conflict } = require('http-errors')
const assert = require('assert').strict

class Member {
  constructor ({ id, roles }) {
    Object.assign(this, {
      username: id,
      roles
    })
  }

  get isServiceAccount () {
    return Member.isServiceAccount(this.username)
  }

  get subject () {
    const [, namespace, name] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(this.username) || []
    if (namespace && name) {
      return {
        kind: 'ServiceAccount',
        namespace,
        name
      }
    }
    return {
      kind: 'User',
      apiGroup: 'rbac.authorization.k8s.io',
      name: this.username
    }
  }

  static isServiceAccount (username) {
    return _.startsWith(username, 'system:serviceaccount:')
  }
}

class SubjectListItem {
  constructor (index) {
    this.index = index
  }

  get id () {
    assert.fail(new TypeError('Getter "id" not implemented'))
  }

  get kind () {
    return _.startsWith(this.id, 'system:serviceaccount:') ? 'ServiceAccount' : 'User'
  }

  get size () {
    return 1
  }

  get roles () {
    assert.fail(new TypeError('Getter "roles" not implemented'))
  }

  set roles (roles) {
    assert.fail(new TypeError('Setter "roles" not implemented'))
  }

  get member () {
    return new Member(this)
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
    this.subject.role = role
    if (_.isEmpty(roles)) {
      delete this.subject.roles
    } else {
      this.subject.roles = _
        .chain(roles)
        .compact()
        .uniq()
        .value()
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

  get size () {
    return this.items.length
  }

  get roles () {
    return _
      .chain(this.items)
      .flatMap('roles')
      .uniq()
      .value()
  }

  set roles (roles) {
    const diff = {
      del: _.difference(this.roles, roles),
      add: _.difference(roles, this.roles)
    }
    const deleteRoles = item => {
      item.roles = _.difference(item.roles, diff.del)
    }
    const addRoles = item => {
      item.roles = _
        .chain(item.roles)
        .concat(diff.add)
        .compact()
        .uniq()
        .value()
    }
    _
      .chain(this.items)
      .forEach(deleteRoles)
      .head()
      .thru(addRoles)
      .commit()

    this.items = _.filter(this.items, item => !!item.roles.length)
  }
}

class SubjectList {
  constructor (subjects) {
    const createItem = (...args) => new SubjectListItemUniq(...args)
    const createGroup = items => {
      return items.length > 1
        ? new SubjectListItemGroup(items)
        : items[0]
    }
    this.subjectListItems = _
      .chain(subjects)
      .map(createItem)
      .groupBy('id')
      .mapValues(createGroup)
      .value()
  }

  get size () {
    return _
      .chain(this.subjectListItems)
      .map('size')
      .sum()
      .value()
  }

  get subjects () {
    const itemOrGroupItems = item => {
      return item instanceof SubjectListItemGroup
        ? item.items
        : item
    }
    return _
      .chain(this.subjectListItems)
      .flatMap(itemOrGroupItems)
      .sortBy(['index'])
      .map(item => item.subject)
      .value()
  }

  get (id) {
    return this.subjectListItems[id]
  }

  set (id, item) {
    this.subjectListItems[id] = item
  }

  add (item) {
    const id = item.id
    if (this.has(id)) {
      throw new TypeError('Subject already exists')
    }
    this.set(id, item)
  }

  delete (id) {
    delete this.subjectListItems[id]
  }

  has (id) {
    return !!this.subjectListItems[id]
  }

  map (iteratee) {
    return _.mapValues(this.subjectListItems, iteratee)
  }
}
exports.SubjectList = SubjectList

class ProjectMemberManager {
  constructor (client, userId, project, serviceAccounts) {
    this.client = client
    this.userId = userId
    this.project = project
    this.serviceAccounts = serviceAccounts
    this.subjectList = new SubjectList(project.spec.members)
  }

  list () {
    const namespace = this.project.spec.namespace
    const ownServiceAccountMembers = members => _.filter(members, {
      subject: {
        kind: 'ServiceAccount',
        namespace
      }
    })

    const assignServiceAccountMetadata = members => {
      const serviceAccountMembers = ownServiceAccountMembers(members)
      if (!_.isEmpty(serviceAccountMembers)) {
        const metadataList = _
          .chain(this.serviceAccounts)
          .map('metadata')
          .keyBy('name')
          .value()
        for (const member of serviceAccountMembers) {
          const name = member.subject.name
          member.createdBy = _.get(metadataList, [name, 'annotations', 'garden.sapcloud.io/createdBy'])
          member.creationTimestamp = _.get(metadataList, [name, 'creationTimestamp'])
        }
      }
      return members
    }

    const projectMembers = this.subjectList.map('member')
    const serviceAccountMembers = ownServiceAccountMembers(projectMembers)
    const noMemberServiceAccounts = _
      .chain(this.serviceAccounts)
      .map('metadata')
      .differenceBy(_.map(serviceAccountMembers, 'subject'), 'name')
      .value()

    const noMemberServiceAccountSubjects = new SubjectList(_.map(noMemberServiceAccounts, ({ name, namespace }) => ({
      name,
      namespace,
      kind: 'ServiceAccount'
    })))

    const noMemberServiceAccountSubjectMembers = noMemberServiceAccountSubjects.map('member')
    return _
      .chain(projectMembers)
      .assign(noMemberServiceAccountSubjectMembers)
      .thru(assignServiceAccountMetadata)
      .values()
      .value()
  }

  async get (name) {
    let member = _.get(this.subjectList.get(name), 'member')

    if (!member) {
      member = new Member({ id: name })
      if (!member.isServiceAccount) {
        // Service Accounts are not part of project member subjects if they have no roles
        throw NotFound(404, 'Member not found')
      }
    }

    if (member.isServiceAccount) {
      const subject = member.subject
      member.kubeconfig = await this.createKubeconfig(subject)
    }

    return member
  }

  async update (name, roles) {
    const item = this.subjectList.get(name)
    if (!item) {
      throw NotFound(404, 'Member not found')
    }
    if (!roles.length) {
      console.log('TYPERR')
      throw new TypeError('Cannot remove roles with update operation. Use remove member instead')
    }
    item.roles = roles
    await this.save()
  }

  async remove (name) {
    await this.removeMember(name)
    await this.deleteServiceAccount(name)
  }

  async create (name, roles) {
    if (this.subjectList.has(name)) {
      throw Conflict(409, 'Member already exists')
    }

    await this.createServiceAccountIfRequired(name)

    if (roles.length) {
      const index = this.subjectList.size
      const subject = new Member({ id: name }).subject
      const item = new SubjectListItemUniq(subject, index)
      item.roles = roles
      this.subjectList.add(item)
      await this.save()
    }
  }

  async removeMember (name) {
    const item = this.subjectList.get(name)
    if (!item) {
      return
    }
    this.subjectList.delete(name)
    await this.save()
  }

  async createServiceAccountIfRequired (name) {
    const member = new Member({ id: name })
    if (!member.isServiceAccount) {
      return
    }

    const namespace = this.project.spec.namespace
    if (member.subject.namespace !== namespace || _.some(this.serviceAccounts, { metadata: { namespace: member.subject.namespace, name: member.subject.name } })) {
      return
    }

    const body = {
      metadata: {
        name: member.subject.name,
        namespace: member.subject.namespace,
        annotations: {
          'garden.sapcloud.io/createdBy': this.userId
        }
      }
    }

    const serviceAccount = await this.client.core.serviceaccounts.create(namespace, body)
    this.serviceAccounts.push(serviceAccount)
  }

  async deleteServiceAccount (name) {
    const member = new Member({ id: name })
    if (!member.isServiceAccount) {
      return
    }
    const namespace = this.project.spec.namespace
    if (member.subject.namespace !== namespace) {
      return
    }
    await this.client.core.serviceaccounts.delete(namespace, member.subject.name)
    _.remove(this.serviceAccounts, { metadata: { namespace: member.subject.namespace, name: member.subject.name } })
  }

  async save () {
    const name = this.project.metadata.name
    const members = this.subjectList.subjects
    await this.client['core.gardener.cloud'].projects.mergePatch(name, { spec: { members } })
  }

  async createKubeconfig ({ namespace, name }) {
    const serviceaccount = _.find(this.serviceAccounts, { metadata: { namespace, name } })
    if (!serviceaccount) {
      throw NotFound(404, 'Service Account not found')
    }
    const server = config.apiServerUrl
    const secretName = _.head(serviceaccount.secrets).name
    const secret = await this.client.core.secrets.get(namespace, secretName)
    const token = decodeBase64(secret.data.token)
    const caData = secret.data['ca.crt']
    const projectName = this.project.metadata.name
    const clusterName = 'garden'
    const contextName = `${clusterName}-${projectName}-${name}`

    return dumpKubeconfig({
      user: name,
      context: contextName,
      cluster: clusterName,
      namespace,
      token,
      server,
      caData
    })
  }

  static async create (user, namespace) {
    const { client, id } = user

    const namespaceResource = await client.core.namespaces.get(namespace)
    const name = _.get(namespaceResource, ['metadata', 'labels', 'project.gardener.cloud/name'])
    if (!name) {
      throw NotFound(404, 'Project not found')
    }

    const [
      project,
      { items: serviceAccounts }
    ] = await Promise.all([
      client['core.gardener.cloud'].projects.get(name),
      client.core.serviceaccounts.list(namespace)
    ])

    return new this(client, id, project, serviceAccounts)
  }
}
exports.ProjectMemberManager = ProjectMemberManager

// list, create and remove is done with the user
exports.list = async function ({ user, namespace }) {
  const memberManager = await ProjectMemberManager.create(user, namespace)
  return memberManager.list()
}

exports.get = async function ({ user, namespace, name }) {
  const memberManager = await ProjectMemberManager.create(user, namespace)
  const member = await memberManager.get(name)

  if (!member) {
    throw new NotFound(`Member '${name}' is not a member of this project`)
  }

  return member
}

exports.create = async function ({ user, namespace, body: { name, roles } }) {
  const memberManager = await ProjectMemberManager.create(user, namespace)
  await memberManager.create(name, roles) // assign user to project, create service account if required
  return memberManager.list()
}

exports.update = async function ({ user, namespace, name, body: { roles } }) {
  // update user in project
  const memberManager = await ProjectMemberManager.create(user, namespace)

  if (Member.isServiceAccount(name)) {
    if (!roles.length) {
      await memberManager.removeMember(name) // unassign service account from project
    } else {
      if (!memberManager.subjectList.has(name)) {
        await memberManager.create(name, roles) // assign service account to project
      } else {
        await memberManager.update(name, roles) // update service account roles
      }
    }
  } else {
    await memberManager.update(name, roles) // update user roles
  }

  return memberManager.list()
}

exports.remove = async function ({ user, namespace, name }) {
  const memberManager = await ProjectMemberManager.create(user, namespace)
  await memberManager.remove(name) // unassign user from project, remove service account if required

  return memberManager.list()
}
