//
// Copyright 2018 by The Gardener Authors.
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

const Promise = require('bluebird')
const request = require('request')
const _ = require('lodash')
const yaml = require('js-yaml')

const STATUS_CODES = require('http').STATUS_CODES
const ClusterConfig = require('./ClusterConfig')
const Watch = require('./Watch')
const Resources = require('./Resources')
const logger = require('../logger')
const { KubernetesError, Forbidden, PreconditionFailed } = require('../errors')
const mappings = require('../mappings')
const { mapSecretToSeed } = mappings
const { mapNamespaceToProject, mapProjectToNamespace } = mappings
const { mapInfrastructureSecretToSecret, mapSecretToInfrastructureSecret } = mappings
const { mapRoleBindingToMembers } = mappings

const seedClients = {}

function getUser (req) {
  const headers = req.headers || {}
  const [, scheme, credentials] = /^([^ ]+) +(.*)$/.exec(headers.authorization) || []
  switch (_.toLower(scheme)) {
    case 'bearer':
      const [, payload] = _.split(credentials, '.')
      if (!payload) {
        return 'token'
      }
      const idToken = {}
      if (payload) {
        try {
          _.assign(idToken, JSON.parse(base64Decode(payload)))
        } catch (err) { /* ignore error */ }
      }
      return idToken.email || idToken.sub || '-'
    case 'basic':
      const [username] = _.split(base64Decode(credentials), ':')
      return username
    default:
      return 'cert'
  }
}

class Client {
  constructor (requestDefaults) {
    this.requestDefaults = requestDefaults
    this.defaultRequestAsync = Promise.promisify(this.defaultRequest)
    this.serviceAccountClient = undefined
  }

  setServiceAccountClient (client) {
    this.serviceAccountClient = client
  }

  getServiceAccountClient () {
    return this.serviceAccountClient || this
  }

  defaultRequest (options, cb) {
    options = _.merge({}, this.requestDefaults, options)
    return request(options, cb)
  }

  request (options, codes) {
    codes = _.concat([], codes || 200)
    const startDate = new Date()
    return this
      .defaultRequestAsync(options)
      .tap(res => {
        const req = res.request
        const host = req.originalHost || `${req.host}:${req.port}` || '-'
        const client = 'gardener'
        const user = getUser(req)
        const method = req.method
        const url = req.path
        const date = res.headers.date || startDate.toGMTString()
        const httpVersion = res.httpVersion || '1.1'
        const statusCode = res.statusCode
        const size = res.headers['content-length'] || '-'
        logger.info(`${host} ${client} ${user} [${date}] "${method} ${url} HTTP/${httpVersion}" ${statusCode} ${size}`)
      })
      .tap(res => {
        if (!_.includes(codes, res.statusCode)) {
          const options = {
            code: res.statusCode,
            reason: STATUS_CODES[res.statusCode],
            message: res.statusMessage,
            status: 'Failure',
            details: {}
          }
          try {
            _.assign(options, JSON.parse(res.body))
          } catch (err) { /* ignore */ }
          logger.info('Kubernetes Error', options)
          throw new KubernetesError(options)
        }
      })
      .then(res => {
        if (_.isPlainObject(res.body)) {
          return res.body
        }
        try {
          return JSON.parse(res.body)
        } catch (err) { /* ignore */ }
        return res.body
      })
  }

  pathname (resource, {namespace, name}) {
    const [, group, version] = /^(?:([^/]+)\/)?(.*)$/.exec(resource.apiVersion)
    let pathname = group ? `/apis/${group.toLowerCase()}` : `/api`
    pathname += `/${version}`
    if (namespace !== false) {
      pathname += `/namespaces/${namespace}`
    }
    pathname += `/${resource.name}`
    if (name) {
      pathname += `/${name}`
    }
    return pathname
  }

  read (resource, params, options = {}) {
    const method = 'GET'
    const url = this.pathname(resource, params)
    return this.request({method, url, ...options})
  }

  create (resource, params, options = {}) {
    const method = 'POST'
    const url = this.pathname(resource, params)
    const json = true
    return this.request({method, url, json, ...options}, [200, 201])
  }

  replace (resource, params, options = {}) {
    const method = 'PUT'
    const url = this.pathname(resource, params)
    const json = true
    return this.request({method, url, json, ...options})
  }

  delete (resource, params, options = {}) {
    const method = 'DELETE'
    const url = this.pathname(resource, params)
    return this.request({method, url, ...options})
  }

  watch (resource, params, options = {}) {
    const url = this.pathname(resource, params)
    const watch = new Watch(this, options, resource)
    watch.connect(url)
    return watch
  }

  patch (resource, params, {body, ...rest}) {
    const method = 'PATCH'
    const url = this.pathname(resource, params)
    if (_.isObjectLike(body)) {
      body = JSON.stringify(body)
    }
    return this.request({method, url, body, ...rest})
  }

  setPatchType (options = {}, type) {
    return _.set(options, ['headers', 'content-type'], `application/${type}+json`)
  }

  jsonPatch (resource, params, options = {}) {
    options = this.setPatchType(options, 'json-patch')
    return this.patch(resource, params, options)
  }

  mergePatch (resource, params, options = {}) {
    options = this.setPatchType(options, 'merge-patch')
    return this.patch(resource, params, options)
  }

  strategicMergePatch (resource, params, options = {}) {
    options = this.setPatchType(options, 'strategic-merge-patch')
    return this.patch(resource, params, options)
  }

  /* Namespaces */

  readNamespaces (options = {}) {
    const namespace = false
    return this.read(Resources.Namespace, {namespace}, options)
  }

  createNamespace (options = {}) {
    const resource = Resources.Namespace
    const apiVersion = resource.apiVersion
    const kind = resource.kind
    const namespace = false
    options.body = _.merge({}, options.body, {kind, apiVersion})
    return this.create(resource, {namespace}, options)
  }

  readNamespace ({name}, options = {}) {
    const namespace = false
    return this.read(Resources.Namespace, {namespace, name}, options)
  }

  deleteNamespace ({name}, options = {}) {
    const namespace = false
    return this.delete(Resources.Namespace, {namespace, name}, options)
  }

  replaceNamespace ({name}, options = {}) {
    const namespace = false
    return this.replace(Resources.Namespace, {namespace, name}, options)
  }

  patchNamespace ({name}, options = {}) {
    const namespace = false
    return this.mergePatch(Resources.Namespace, {namespace, name}, options)
  }

  watchNamespaces (options = {}) {
    const namespace = false
    return this.watch(Resources.Namespace, {namespace}, options)
  }

  /* ClusterRoleBindings */

  readClusterRoleBinding ({name}, options = {}) {
    const namespace = false
    return this.read(Resources.ClusterRoleBinding, {namespace, name}, options)
  }

  /* Secrets */

  readSecrets ({namespace}, options = {}) {
    return this.read(Resources.Secret, {namespace}, options)
  }

  createSecret ({namespace}, {body, ...rest} = {}) {
    const resource = Resources.Secret
    const apiVersion = resource.apiVersion
    const kind = resource.kind
    body = _.merge({}, body, {kind, apiVersion, metadata: {namespace}})
    return this.create(resource, {namespace}, {body, ...rest})
  }

  readSecret (params, options = {}) {
    return this.read(Resources.Secret, params, options)
  }

  replaceSecret (params, options = {}) {
    return this.replace(Resources.Secret, params, options)
  }

  patchSecret (params, options = {}) {
    return this.mergePatch(Resources.Secret, params, options)
  }

  deleteSecret (params, options = {}) {
    return this.delete(Resources.Secret, params, options)
  }

  /* ClusterRoles */

  createClusterRole ({body, ...rest} = {}) {
    const resource = Resources.ClusterRole
    const apiVersion = resource.apiVersion
    const kind = resource.kind
    const namespace = false
    body = _.merge({}, body, {kind, apiVersion, metadata: {namespace}})
    return this.create(resource, {namespace}, {body, ...rest})
  }

  /* RoleBindings */

  readRoleBindings ({namespace}, options = {}) {
    return this.read(Resources.RoleBinding, {namespace}, options)
  }

  createRoleBinding ({namespace}, {body, ...rest} = {}) {
    const resource = Resources.RoleBinding
    const apiVersion = resource.apiVersion
    const kind = resource.kind
    body = _.merge({}, body, {kind, apiVersion, metadata: {namespace}})
    return this.create(resource, {namespace}, {body, ...rest})
  }

  readRoleBinding (params, options = {}) {
    return this.read(Resources.RoleBinding, params, options)
  }

  replaceRoleBinding (params, options = {}) {
    return this.replace(Resources.RoleBinding, params, options)
  }

  patchRoleBinding (params, options = {}) {
    return this.mergePatch(Resources.RoleBinding, params, options)
  }

  /* Shoots */

  readShoots ({namespace}, options = {}) {
    return this.read(Resources.Shoot, {namespace}, options)
  }

  readShoot (params, options = {}) {
    return this.read(Resources.Shoot, params, options)
  }

  patchShoot (params, {body, ...rest} = {}) {
    return this.mergePatch(Resources.Shoot, params, {body, ...rest})
  }

  deleteShoot ({namespace, name}, {auth, ...rest} = {}) {
    return this.delete(Resources.Shoot, {namespace, name}, {auth, ...rest})
      .then(() => this.readShoot({namespace, name}, {auth}))
      .then(({metadata}) => {
        return {
          metadata: {
            annotations: {
              'confirmation.garden.sapcloud.io/deletionTimestamp': metadata.deletionTimestamp,
              'action.garden.sapcloud.io/delete': name
            }
          }
        }
      })
      .then(body => this.patchShoot({namespace, name}, {auth, body}))
  }

  watchShoots (options = {}) {
    const namespace = false
    return this.watch(Resources.Shoot, {namespace}, options)
  }

  /* Seeds */

  readSeeds ({qs = {}, ...rest} = {}) {
    qs.labelSelector = 'garden.sapcloud.io/role=seed'
    const namespace = 'garden'
    return this.readSecrets({namespace}, {qs, ...rest})
      .then(list => _.map(list.items, mapSecretToSeed))
  }

  /* Infrastructure Secrets */

  readInfrastructureSecrets (params, {qs = {}, ...rest} = {}) {
    qs.labelSelector = 'garden.sapcloud.io/role=infrastructure'
    return this.readSecrets(params, {qs, ...rest})
      .then(list => _.map(list.items, mapSecretToInfrastructureSecret))
  }

  createInfrastructureSecret (params, {body, ...rest} = {}) {
    body = mapInfrastructureSecretToSecret(body)
    return this.createSecret(params, {body, ...rest})
      .then(mapSecretToInfrastructureSecret)
  }

  readInfrastructureSecret (params, options = {}) {
    return this.readSecret(params, options)
      .then(mapSecretToInfrastructureSecret)
  }

  replaceInfrastructureSecret (params, {body, ...rest} = {}) {
    body = mapInfrastructureSecretToSecret(body)
    return this.replaceSecret(params, {body, ...rest})
      .then(mapSecretToInfrastructureSecret)
  }

  patchInfrastructureSecret (params, {body, ...rest} = {}) {
    body = mapInfrastructureSecretToSecret(body)
    return this.patchSecret(params, {body, ...rest})
      .then(mapSecretToInfrastructureSecret)
  }

  deleteInfrastructureSecret (params, options = {}) {
    return this.deleteSecret(params, options)
      .then(() => {
        return {metadata: params}
      })
  }

  /* Projects */

  readProjects ({username}, options = {}) {
    const {auth} = options
    const namespace = false
    const isMemberOf = (roleBindings, subject) => {
      const userNamespaces = _
        .chain(roleBindings.items)
        .filter(item => _.findIndex(item.subjects, subject) !== -1)
        .map(item => item.metadata.namespace)
        .value()
      return item => _.includes(userNamespaces, item.metadata.name)
    }
    const emptyClusterRoleBinding = {
      subjects: []
    }
    return Promise
      .props({
        namespaces: this.readNamespaces({
          auth, qs: {labelSelector: 'garden.sapcloud.io/role=project'}
        }),
        roleBindings: this.readRoleBindings({namespace}, {
          auth, qs: {labelSelector: 'garden.sapcloud.io/role=members'}
        }),
        gardenAdministrators: this.readClusterRoleBinding({name: 'garden-administrators'}, {
          auth
        }).catch(KubernetesError, () => emptyClusterRoleBinding)
      })
      .then(({namespaces, roleBindings, gardenAdministrators}) => {
        const subject = {
          kind: 'User',
          name: username
        }
        const predicate = _.findIndex(gardenAdministrators.subjects, subject) === -1
          ? isMemberOf(roleBindings, subject)
          : _.identity
        return _
          .chain(namespaces.items)
          .filter(predicate)
          .map(mapNamespaceToProject)
          .value()
      })
  }

  createProjectTerraformers ({namespace}, options = {}) {
    const ClusterRole = Resources.ClusterRole
    const body = {
      metadata: {
        name: 'garden-terraformers',
        namespace,
        labels: {
          'garden.sapcloud.io/role': 'terraformers'
        }
      },
      roleRef: {
        apiGroup: ClusterRole.apiGroup,
        kind: ClusterRole.kind,
        name: 'garden-terraformer'
      },
      subjects: [{
        kind: 'ServiceAccount',
        name: 'default',
        namespace
      }]
    }
    return this.createRoleBinding({namespace}, {...options, body})
  }

  createProjectMembers ({namespace, username}, options = {}) {
    const ClusterRole = Resources.ClusterRole
    const body = {
      metadata: {
        name: 'garden-project-members',
        namespace,
        labels: {
          'garden.sapcloud.io/role': 'members'
        }
      },
      roleRef: {
        apiGroup: ClusterRole.apiGroup,
        kind: ClusterRole.kind,
        name: 'garden-project-member'
      },
      subjects: [{
        kind: 'User',
        name: username,
        apiGroup: 'rbac.authorization.k8s.io'
      }]
    }
    return this.createRoleBinding({namespace}, {...options, body})
  }

  initializeProject (params, options = {}) {
    return Promise.all([
      this.createProjectTerraformers(params, options),
      this.createProjectMembers(params, options)
    ])
  }

  createProject ({username}, {body, ...rest} = {}) {
    _.set(body, 'data.createdBy', username)
    body = mapProjectToNamespace(body)
    const namespace = body.metadata.name
    return this
      .createNamespace({body, ...rest})
      .tap(() => this.initializeProject({namespace, username}, rest))
      .then(mapNamespaceToProject)
  }

  readProject (params, options = {}) {
    return this.readNamespace(params, options)
      .then(mapNamespaceToProject)
  }

  patchProject (params, {body, ...rest} = {}) {
    _.unset(body, 'data.createdBy')
    body = mapProjectToNamespace(body)
    return this.patchNamespace(params, {body, ...rest})
      .then(mapNamespaceToProject)
  }

  deleteProject ({ name, username }, options = {}) {
    const namespace = name
    const projectName = namespace.replace(/^garden-/, '')
    return Promise
      .props({
        members: this.readMembers({namespace}),
        shootList: this.readShoots({namespace})
      })
      .tap(({members, shootList}) => {
        if (!_.includes(members, username)) {
          throw new Forbidden(`User ${username} is not a member of project ${projectName}`)
        }
        if (shootList.items.length > 0) {
          throw new PreconditionFailed(`Only empty projects can be deleted`)
        }
      })
      .then(() => this.deleteNamespace({name}, options))
      .then(() => {
        return {metadata: {name: projectName}}
      })
  }

  replaceProject (params, {body, ...rest} = {}) {
    body = mapProjectToNamespace(body)
    return this.replaceNamespace(params, {body, ...rest})
      .then(mapNamespaceToProject)
  }

  /* Members */

  readMemberRoleBinding ({namespace}, options = {}) {
    const name = 'garden-project-members'
    return this.readRoleBinding({namespace, name}, options)
  }

  patchMemberRoleBinding ({namespace}, options = {}) {
    const name = 'garden-project-members'
    return this.patchRoleBinding({namespace, name}, options)
  }

  readMembers (params, options = {}) {
    return this.readMemberRoleBinding(params, options)
      .then(mapRoleBindingToMembers)
  }

  addMember (params, {body, ...rest} = {}) {
    const {name} = body
    return this.readMemberRoleBinding(params, rest)
      .then(body => {
        const subjects = body.subjects
        if (_.find(subjects, ['name', name])) {
          return body
        }
        subjects.push({
          kind: 'User',
          name: name,
          apiGroup: 'rbac.authorization.k8s.io'
        })
        return this.patchMemberRoleBinding(params, {body, ...rest})
      })
      .then(mapRoleBindingToMembers)
  }

  deleteMember ({namespace, name}, options = {}) {
    return this.readMemberRoleBinding({namespace}, options)
      .then(body => {
        _.remove(body.subjects, ['name', name])
        return this.patchMemberRoleBinding({namespace}, {...options, body})
      })
      .then(mapRoleBindingToMembers)
  }

  /* Seed Cluster Client */

  getSeedClient (kind, region) {
    const client = _.get(seedClients, [kind, region])
    if (client) {
      return Promise.resolve(client)
    }
    const namespace = 'garden'
    const ls = [
      'garden.sapcloud.io/role=seed',
      `infrastructure.garden.sapcloud.io/kind=${kind}`,
      `infrastructure.garden.sapcloud.io/region=${region}`
    ]
    const qs = {
      labelSelector: ls.join(',')
    }
    return this
      .getServiceAccountClient()
      .readSecrets({namespace}, {qs})
      .then(secrets => {
        const kubeconfig = _
          .chain(secrets)
          .get('items')
          .first()
          .get('data.kubeconfig')
          .thru(base64Decode)
          .value()
        const client = Client.fromKubeconfig(kubeconfig)
        _.set(seedClients, [kind, region])
        return client
      })
  }

  readShootSeedKubeconfig ({namespace, name}, options = {}) {
    let shootName
    const gardenNamespace = namespace
    return this
      .readShoot({namespace, name}, options)
      .then(shoot => {
        shootName = shoot.metadata.name
        const kind = shoot.spec.infrastructure.kind
        const region = shoot.spec.infrastructure.region
        return this.getSeedClient(kind, region)
      })
      .then(client => {
        const namespace = `shoot-${gardenNamespace}-${shootName}`
        const name = 'kubecfg'
        return client.readSecret({namespace, name})
      })
      .then(secret => {
        const data = _
          .chain(secret)
          .get('data')
          .pick('kubeconfig', 'username', 'password')
          .map((value, key) => [key, base64Decode(value)])
          .fromPairs()
          .value()
        const kubeconfig = yaml.safeLoad(data.kubeconfig)
        const contextName = kubeconfig['current-context']
        const clusterName = _.chain(kubeconfig.contexts)
          .find(['name', contextName])
          .get('context.cluster')
          .value()
        const server = _
          .chain(kubeconfig.clusters)
          .find(['name', clusterName])
          .get('cluster.server')
          .value()
        data.serverUrl = server
        return data
      })
  }

  /* Static methods */

  static create ({url, ca, key, cert, auth, insecureSkipTlsVerify = false}) {
    const baseUrl = url
    const strictSSL = !insecureSkipTlsVerify

    const options = {
      baseUrl,
      strictSSL
    }

    if (strictSSL && ca) {
      options.ca = ca
    }

    if (auth) {
      options.auth = auth
    } else if (key && cert) {
      options.key = key
      options.cert = cert
    }
    return new Client(options)
  }

  static fromKubeconfig (kubeconfig) {
    return this.create(ClusterConfig.fromKubeconfig({kubeconfig}))
  }
}

function base64Decode (data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

module.exports = Client
