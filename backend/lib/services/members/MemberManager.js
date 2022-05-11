//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { NotFound, Conflict, UnprocessableEntity, isHttpError } = require('http-errors')
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
    this.subjectList = new SubjectList(project, serviceAccounts)
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

  async rotateServiceAccountSecret (id) {
    const item = this.subjectList.get(id)
    if (!item) {
      return
    }

    if (item.kind !== 'ServiceAccount') {
      throw new UnprocessableEntity('Member is not a ServiceAccount')
    }

    await this.deleteServiceAccountSecrets(item)
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
      return // foreign service account => early exit, nothing to create
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
      throw new UnprocessableEntity('It is not possible to modify ServiceAccount from another namespace')
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
      return // foreign service account => early exit, nothing to delete
    }
    try {
      await this.client.core.serviceaccounts.delete(namespace, name)
    } catch (err) {
      if (!isHttpError(err) || err.statusCode !== 404) {
        throw err
      }
    }
    this.subjectList.delete(item.id)
  }

  async deleteServiceAccountSecrets (item) {
    const { namespace } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      throw new UnprocessableEntity('It is not possible to modify a ServiceAccount from another namespace')
    }

    const results = await _
      .chain(item)
      .get('extensions.secrets')
      .map(({ name }) => this.client.core.secrets.delete(namespace, name))
      .thru(promises => Promise.allSettled(promises))
      .value()

    this.constructor.getFulfilledValues(results)
  }

  async getKubeconfig (item) {
    const { namespace, name } = Member.parseUsername(item.id)

    const results = await _
      .chain(item)
      .get('extensions.secrets')
      .map(({ name }) => this.client.core.secrets.get(namespace, name))
      .thru(promises => Promise.allSettled(promises))
      .value()

    const values = this.constructor.getFulfilledValues(results)

    const secret = _
      .chain(values)
      .orderBy(['metadata.creationTimestamp'], ['desc'])
      .head()
      .value()

    const token = decodeBase64(secret.data.token)
    const server = config.apiServerUrl
    const caData = config.apiServerCaData
    const projectName = this.projectName
    const clusterName = 'garden'
    const contextName = `${clusterName}-${projectName}-${name}`

    return dumpKubeconfig({
      userName: name,
      contextName,
      clusterName,
      namespace,
      token,
      server,
      caData
    })
  }

  static getFulfilledValues (results) {
    const errors = _
      .chain(results)
      .filter(['status', 'rejected'])
      .map('reason')
      .filter(err => !isHttpError(err) || err.statusCode !== 404)
      .value()

    if (errors.length === 1) {
      throw errors[0]
    } else if (errors.length > 1) {
      const message = errors.map(err => err.message).join('\n')
      throw new AggregateError(errors, message)
    }

    return _
      .chain(results)
      .filter(['status', 'fulfilled'])
      .map('value')
      .value()
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
