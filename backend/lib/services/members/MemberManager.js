//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import kubeConfigModule from '@gardener-dashboard/kube-config'
import kubeClientModule from '@gardener-dashboard/kube-client'
import config from '../../config/index.js'
import Member from './Member.js'
import SubjectListItem from './SubjectListItem.js'
import SubjectList from './SubjectList.js'
import getCache from '../../cache/index.js'

const { dumpKubeconfig } = kubeConfigModule
const { Resources } = kubeClientModule
const { NotFound, Conflict, UnprocessableEntity, isHttpError } = httpErrors

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
        kubeconfig: await this.getKubeconfig(item),
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
        description,
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
      if (item.extensions?.orphaned) {
        await this.createServiceAccount(item, {
          createdBy: this.userId,
          description,
        })
        item.extend({
          orphaned: false,
        })
      } else {
        await this.updateServiceAccount(item, { description })
      }
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

  async resetServiceAccount (id) {
    const item = this.subjectList.get(id)
    if (!item) {
      return this.subjectList.members
    }

    if (item.kind !== 'ServiceAccount') {
      throw new UnprocessableEntity('Member is not a ServiceAccount')
    }

    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      throw new UnprocessableEntity('It is not possible to reset a ServiceAccount from another namespace')
    }

    try {
      await this.client.core.serviceaccounts.delete(namespace, name)
    } catch (err) {
      if (!isHttpError(err) || err.statusCode !== 404) {
        throw err
      }
    }

    const createdBy = item.extensions?.createdBy ?? this.userId // restore original creator, fallback to current user
    const description = item.extensions?.description

    const annotations = {
      'dashboard.gardener.cloud/created-by': createdBy,
      'dashboard.gardener.cloud/description': description,
    }

    let serviceAccount
    try {
      serviceAccount = await this.client.core.serviceaccounts.create(namespace, {
        metadata: {
          name,
          namespace,
          annotations,
        },
      })
    } catch (err) {
      if (!isHttpError(err) || err.statusCode !== 409) {
        throw err
      }

      // the create usually will fail for the "default" service account as it will be automatically created after it was deleted
      // in this case we just want to restore the annotations
      serviceAccount = await this.client.core.serviceaccounts.mergePatch(namespace, name, {
        metadata: {
          annotations,
        },
      })
    }

    const {
      metadata: {
        creationTimestamp,
      },
    } = serviceAccount

    item.extend({
      createdBy,
      creationTimestamp,
      description,
      orphaned: false,
    })
    this.subjectList.set(item.id, item)

    return this.subjectList.members
  }

  setItemRoles (item, roles) {
    if (!Array.isArray(roles)) {
      throw new UnprocessableEntity('Roles must be an array')
    }
    const MAX_ROLES = 10 // Define a reasonable limit for roles
    if (roles.length > MAX_ROLES) {
      throw new UnprocessableEntity(`Roles array exceeds the maximum allowed size of ${MAX_ROLES}`)
    }
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
          'dashboard.gardener.cloud/description': description,
        },
      },
    })
    const {
      metadata: {
        creationTimestamp,
      },
    } = serviceAccount

    item.extend({
      createdBy,
      creationTimestamp,
      description,
    })
    this.subjectList.set(item.id, item)
  }

  async updateServiceAccount (item, { description }) {
    const { namespace, name } = Member.parseUsername(item.id)
    if (namespace !== this.namespace) {
      return // foreign service account => early exit, nothing to update
    }

    const isDirty = item.extend({ description })
    if (isDirty) {
      await this.client.core.serviceaccounts.mergePatch(namespace, name, {
        metadata: {
          annotations: {
            'dashboard.gardener.cloud/description': description,
          },
        },
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

  async getKubeconfig (item) {
    const defaultTokenExpiration = _.get(config, ['frontend', 'serviceAccountDefaultTokenExpiration'], 7776000) // default is 90 days

    const { namespace, name } = Member.parseUsername(item.id)

    const { apiVersion, kind } = Resources.TokenRequest
    const body = {
      kind,
      apiVersion,
      spec: {
        audiences: _.get(config, ['tokenRequestAudiences']),
        expirationSeconds: defaultTokenExpiration,
      },
    }

    const tokenRequest = await this.client.core.serviceaccounts.createTokenRequest(namespace, name, body)

    const token = tokenRequest.status.token
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
      caData,
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

  static async create ({ client, id, workspace }, namespace) {
    const cache = getCache(workspace)
    const name = cache.findProjectByNamespace(namespace).metadata.name
    const [
      project,
      { items: serviceAccounts },
    ] = await Promise.all([
      client['core.gardener.cloud'].projects.get(name),
      client.core.serviceaccounts.list(namespace),
    ])
    return new this(client, id, project, serviceAccounts)
  }
}

export default MemberManager
