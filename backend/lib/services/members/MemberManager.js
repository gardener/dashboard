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
const { NotFound, Conflict, UnprocessableEntity, MethodNotAllowed } = require('http-errors')
const { dumpKubeconfig } = require('@gardener-dashboard/kube-config')

const config = require('../../config')
const { findProjectByNamespace } = require('../../cache')
const { decodeBase64 } = require('../../utils')
const Member = require('./Member')
const SubjectListItem = require('./SubjectListItem')
const SubjectList = require('./SubjectList')

class MemberManager {
  constructor (client, userId, project, serviceAccounts) {
    this.client = client
    this.userId = userId
    this.namespace = project.spec.namespace
    this.projectName = project.metadata.name
    this.subjectList = new SubjectList(project.spec.members, serviceAccounts)
  }

  list () {
    return this.subjectList.members
  }

  async get (id) {
    const item = this.subjectList.get(id)
    if (!item) {
      const { kind } = Member.parseUsername(id)
      throw new NotFound(`${kind} '${id}' is not related to this project`)
    }

    if (item.kind === 'ServiceAccount') {
      item.extend({
        kubeconfig: await this.getKubeconfig(item)
      })
    }
    return item.member
  }

  async create (id, { roles, description }) {
    let item = this.subjectList.get(id)
    if (item) {
      throw new Conflict(`${item.kind} '${id}' already exists`)
    }
    item = SubjectListItem.create(id, SubjectListItem.END_OF_LIST)

    this.setItemRoles(item, roles)

    if (item.kind === 'ServiceAccount') {
      await this.createServiceAccount(item, {
        createdBy: this.userId,
        description
      })
    }
    if (roles.length) {
      this.subjectList.set(id, item)
      await this.save()
    }
    return this.subjectList.members
  }

  async update (id, { roles, description }) {
    const item = this.subjectList.get(id)
    if (!item) {
      const { kind } = Member.parseUsername(id)
      throw new NotFound(`${kind} '${id}' is not related to this project`)
    }

    this.setItemRoles(item, roles)

    if (item.kind === 'ServiceAccount') {
      await this.updateServiceAccount(item, { description })
    }
    await this.save()
    return this.subjectList.members
  }

  async delete (id) {
    const item = this.subjectList.get(id)
    if (!item) {
      return this.subjectList.members
    }

    if (item.kind === 'ServiceAccount') {
      await this.deleteServiceAccount(item)
    }
    this.subjectList.delete(id)
    await this.save()
    return this.subjectList.members
  }

  async deleteSecret (id) {
    const item = this.subjectList.get(id)
    if (!item) {
      return this.subjectList.members
    }

    if (!item.kind === 'ServiceAccount') {
      throw new MethodNotAllowed('Member is not a ServiceAccount')
    }

    await this.deleteServiceAccountSecret(item)

    return this.subjectList.members
  }

  setItemRoles (item, roles) {
    roles = _.compact(roles)
    if (!roles.length && item.kind !== 'ServiceAccount') {
      throw new UnprocessableEntity('At least one role is required')
    }
    item.roles = roles
  }

  save () {
    const name = this.projectName
    const members = this.subjectList.subjects
    return this.client['core.gardener.cloud'].projects.mergePatch(name, { spec: { members } })
  }

  async createServiceAccount (item, { createdBy, description }) {
    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      return
    }

    const serviceAccount = await this.client.core.serviceaccounts.create(namespace, {
      metadata: {
        name,
        namespace,
        annotations: {
          'dashboard.gardener.cloud/created-by': createdBy,
          'dashboard.gardener.cloud/description': description
        }
      }
    })
    const {
      metadata: {
        creationTimestamp
      }
    } = serviceAccount

    item.extend({
      createdBy,
      creationTimestamp,
      description
    })
    this.subjectList.set(item.id, item)
  }

  async updateServiceAccount (item, { description }) {
    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      return
    }

    const isDirty = item.extend({ description })
    if (isDirty) {
      await this.client.core.serviceaccounts.mergePatch(namespace, name, {
        metadata: {
          annotations: {
            'dashboard.gardener.cloud/description': description
          }
        }
      })
    }
  }

  async deleteServiceAccount (item) {
    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      return
    }

    await this.client.core.serviceaccounts.delete(namespace, name)
    this.subjectList.delete(item.id)
  }

  async deleteServiceAccountSecret (item) {
    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      return
    }

    const secretName = _
      .chain(item)
      .get('extensions.secrets')
      .head()
      .get('name')
      .value()
    return await this.client.core.secrets.delete(namespace, secretName)
  }

  async getKubeconfig (item) {
    const { namespace, name } = Member.parseUsername(item.id)
    const secretName = _
      .chain(item)
      .get('extensions.secrets')
      .head()
      .get('name')
      .value()
    const secret = await this.client.core.secrets.get(namespace, secretName)
    const token = decodeBase64(secret.data.token)
    const server = config.apiServerUrl
    const caData = secret.data['ca.crt']
    const projectName = this.projectName
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

  static async create ({ client, id }, namespace) {
    const name = findProjectByNamespace(namespace).metadata.name
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

module.exports = MemberManager
