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

const _ = require('lodash')
const nock = require('nock')
const yaml = require('js-yaml')
const { credentials, Resources } = require('../../../lib/kubernetes')
const { encodeBase64 } = require('../../../lib/utils')
const jwt = require('jsonwebtoken')
const clientConfig = credentials()
const url = clientConfig.url
const auth = clientConfig.auth

const quotas = [
  {
    name: 'foo-quota1',
    namespace: 'garden-foo'
  },
  {
    name: 'foo-quota2',
    namespace: 'garden-foo'
  }
]

const secretBindingList = [
  getSecretBinding('garden-foo', 'foo-infra1', 'infra1-profileName', 'garden-foo', 'secret1', quotas),
  getSecretBinding('garden-foo', 'foo-infra3', 'infra3-profileName', 'garden-foo', 'secret2', quotas),
  getSecretBinding('garden-foo', 'trial-infra1', 'infra1-profileName', 'garden-trial', 'trial-secret', quotas)
]

const projectList = [
  getProject({
    name: 'foo',
    createdBy: 'bar@example.org',
    owner: 'foo@example.org',
    members: [
      'bar@example.org',
      'system:serviceaccount:garden-foo:robot'
    ],
    description: 'foo-description',
    purpose: 'foo-purpose'
  }),
  getProject({
    name: 'bar',
    createdBy: 'foo@example.org',
    owner: 'bar@example.org',
    members: [
      'foo@example.org',
      'system:serviceaccount:garden-bar:robot'
    ],
    description: 'bar-description',
    purpose: 'bar-purpose'
  }),
  getProject({
    name: 'new',
    createdBy: 'new@example.org',
    description: 'new-description',
    purpose: 'new-purpose',
    phase: 'Initial'
  }),
  getProject({
    name: 'secret',
    createdBy: 'admin@example.org',
    description: 'secret-description',
    purpose: 'secret-purpose'
  })
]

const shootList = [
  getShoot({
    name: 'fooShoot',
    namespace: 'garden-foo',
    createdBy: 'fooCreator',
    purpose: 'fooPurpose',
    bindingName: 'fooSecretName'
  }),
  getShoot({
    name: 'barShoot',
    namespace: 'garden-foo',
    createdBy: 'barCreator',
    purpose: 'barPurpose',
    bindingName: 'barSecretName'
  }),
  getShoot({
    name: 'dummyShoot',
    namespace: 'garden-foo',
    createdBy: 'fooCreator',
    purpose: 'fooPurpose',
    bindingName: 'barSecretName'
  })
]

const infrastructureSecretList = [
  getInfrastructureSecret('garden-foo', 'secret1', 'infra1-profileName', {
    fooKey: 'fooKey',
    fooSecret: 'fooSecret'
  }),
  getInfrastructureSecret('garden-foo', 'secret2', 'infra2-profileName', {
    fooKey: 'fooKey',
    fooSecret: 'fooSecret'
  })
]

const serviceAccountList = [
  getServiceAccount('garden-foo', 'robot'),
  getServiceAccount('garden-bar', 'robot')
]

const serviceAccountSecretList = [
  getServiceAccountSecret('garden-foo', 'robot'),
  getServiceAccountSecret('garden-bar', 'robot')
]

const gardenAdministrators = ['admin@example.org']

const certificateAuthorityData = encodeBase64('certificate-authority-data')
const clientCertificateData = encodeBase64('client-certificate-data')
const clientKeyData = encodeBase64('client-key-data')

function getSecretBinding (namespace, name, profileName, secretRefName, secretRefNamespace, quotas = []) {
  const secretBinding = {
    kind: 'SecretBinding',
    metadata: {
      name,
      namespace,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': profileName
      }
    },
    secretRef: {
      name: secretRefName,
      namespace: secretRefNamespace
    },
    quotas
  }

  return secretBinding
}

function getServiceAccount (namespace, name) {
  const suffix = Buffer.from(name, 'utf8').toString('hex').substring(0, 5)
  const secret = {
    name: `${name}-token-${suffix}`
  }
  const metadata = {
    name,
    namespace
  }
  return {
    metadata,
    secrets: [secret]
  }
}

function getServiceAccountSecret (namespace, serviceAccountName) {
  const suffix = Buffer.from(serviceAccountName, 'utf8').toString('hex').substring(0, 5)
  const name = `${serviceAccountName}-token-${suffix}`
  const metadata = {
    name,
    namespace
  }
  const data = {}
  data['ca.crt'] = encodeBase64('ca.crt')
  data['namespace'] = encodeBase64(namespace)
  data['token'] = encodeBase64(name)
  return {
    metadata,
    data
  }
}

function prepareSecretAndBindingMeta ({name, namespace, data, resourceVersion, bindingName, bindingNamespace, cloudProfileName}) {
  const metadataSecretBinding = {
    resourceVersion,
    name: bindingName,
    namespace: bindingNamespace,
    labels: {
      'cloudprofile.garden.sapcloud.io/name': cloudProfileName
    }
  }
  const secretRef = {
    name,
    namespace
  }
  const resultSecretBinding = {
    metadata: metadataSecretBinding,
    secretRef
  }

  const metadataSecret = {
    resourceVersion,
    namespace
  }
  const resultSecret = {
    metadata: metadataSecret,
    data
  }

  return {metadataSecretBinding, secretRef, resultSecretBinding, metadataSecret, resultSecret}
}

function canCreateProjects (scope) {
  return scope
    .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, body => {
      const { namespace, verb, resource, group } = body.spec.resourceAttributes
      return !namespace && group === 'garden.sapcloud.io' && resource === 'projects' && verb === 'create'
    })
    .reply(200, function (uri, body) {
      const [, token] = _.split(this.req.headers.authorization, ' ', 2)
      const payload = jwt.decode(token)
      const allowed = _.endsWith(payload.id, 'example.org')
      return _.assign({
        status: {
          allowed
        }
      }, body)
    })
}

function reviewToken (scope) {
  return scope
    .post('/apis/authentication.k8s.io/v1/tokenreviews')
    .reply(200, function (uri, body) {
      const { spec: { token } } = body
      const payload = jwt.decode(token)
      const authenticated = _.endsWith(payload.id, 'example.org')
      const username = payload.id
      const groups = payload.groups
      const user = authenticated ? { username, groups } : {}
      return {
        status: {
          user,
          authenticated
        }
      }
    })
}

function canDeleteShootsInAllNamespaces (scope) {
  return scope
    .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, body => {
      const { namespace, verb, resource, group } = body.spec.resourceAttributes
      return !namespace && group === 'garden.sapcloud.io' && resource === 'shoots' && verb === 'delete'
    })
    .reply(200, function (body) {
      const [, token] = _.split(this.req.headers.authorization, ' ', 2)
      const payload = jwt.decode(token)
      const allowed = _.includes(gardenAdministrators, payload.id)
      return _.assign({
        status: {
          allowed
        }
      }, body)
    })
}

function readProject (namespace) {
  return _
    .chain(projectList)
    .find(['spec.namespace', namespace])
    .value()
}

function readProjectMembers (namespace) {
  return getProjectMembers(readProject(namespace))
}

function getProjectMembers (project) {
  return _
    .chain(project)
    .get('spec.members')
    .map('name')
    .value()
}

function getInfrastructureSecret (namespace, name, profileName, data = {}) {
  return {
    metadata: {
      name,
      namespace,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': profileName
      }
    },
    data
  }
}

function getUser (name) {
  return {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name
  }
}

function getProject ({name, namespace, createdBy, owner, members = [], description, purpose, phase = 'Ready'}) {
  owner = owner || createdBy
  namespace = namespace || `garden-${name}`
  members = _
    .chain(members)
    .concat(owner)
    .uniq()
    .map(getUser)
    .value()
  owner = getUser(owner)
  createdBy = getUser(createdBy)
  return {
    metadata: {
      name
    },
    spec: {
      namespace,
      createdBy,
      owner,
      members,
      purpose,
      description
    },
    status: {
      phase
    }
  }
}

function getProjectNamespace (namespace) {
  const project = readProject(namespace)
  const defaultName = namespace.replace(/^garden-/)
  const name = _.get(project, 'metadata.name', defaultName)
  return {
    metadata: {
      name: namespace,
      labels: {
        'garden.sapcloud.io/role': 'project',
        'project.garden.sapcloud.io/name': name
      }
    }
  }
}

function getShoot ({
  namespace,
  name,
  createdBy,
  purpose = 'foo-purpose',
  kind = 'fooInfra',
  profile = 'infra1-profileName',
  region = 'foo-west',
  bindingName = 'foo-secret',
  seed = 'infra1-seed',
  hibernation = { enabled: false }
}) {
  const shoot = {
    metadata: {
      name,
      namespace,
      annotations: {
        'garden.sapcloud.io/purpose': purpose
      }
    },
    spec: {
      hibernation,
      cloud: {
        profile,
        region,
        seed,
        secretBindingRef: {
          name: bindingName,
          namespace
        }
      }
    }
  }
  shoot.spec.cloud[kind] = {}

  if (createdBy) {
    shoot.metadata.annotations['garden.sapcloud.io/createdBy'] = createdBy
  }
  return shoot
}

function getKubeconfig ({server, name}) {
  const cluster = {
    'certificate-authority-data': certificateAuthorityData,
    server
  }
  const user = {
    'client-certificate-data': clientCertificateData,
    'client-key-data': clientKeyData
  }
  const context = {
    cluster: name,
    user: name
  }
  return yaml.safeDump({
    kind: 'Config',
    clusters: [{cluster, name}],
    contexts: [{context, name}],
    users: [{user, name}],
    'current-context': name
  })
}

function authorizationHeader (bearer) {
  const authorization = `Bearer ${bearer}`
  return {authorization}
}

function nockWithAuthorization (bearer) {
  const reqheaders = authorizationHeader(bearer || auth.bearer)
  return nock(url, {reqheaders})
}

const stub = {
  getShoots ({bearer, namespace}) {
    const shoots = {
      items: shootList
    }

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`)
      .reply(200, shoots)
  },
  getShoot ({ bearer, namespace, name, ...rest }) {
    const shoot = getShoot({ namespace, name, ...rest })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, shoot)
  },
  createShoot ({bearer, namespace, spec, resourceVersion = 42}) {
    const metadata = {
      resourceVersion,
      namespace
    }
    const result = {metadata, spec}

    return nockWithAuthorization(bearer)
      .post(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`, body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  deleteShoot ({bearer, namespace, name, resourceVersion = 42}) {
    const metadata = {
      resourceVersion,
      namespace
    }
    const result = {metadata}

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200)
      .delete(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, () => result)
  },
  getShootInfo ({
    bearer,
    namespace,
    name,
    project,
    kind,
    region,
    shootServerUrl,
    shootUser,
    shootPassword,
    monitoringUser,
    monitoringPassword,
    loggingUser,
    loggingPassword,
    seedClusterName,
    seedSecretName,
    seedName
  }) {
    const seedServerURL = 'https://seed.foo.bar:8443'
    const technicalID = `shoot--${project}--${name}`

    const shootResult = getShoot({name, project, kind, region, seed: seedName})
    shootResult.status = {
      technicalID: `shoot--${project}--${name}`
    }
    const kubecfgResult = {
      data: {
        kubeconfig: encodeBase64(getKubeconfig({
          server: shootServerUrl,
          name: 'shoot.foo.bar'
        })),
        username: encodeBase64(shootUser),
        password: encodeBase64(shootPassword)
      }
    }
    const isAdminResult = {
      status: {
        allowed: true
      }
    }
    const seedSecretResult = {
      data: {
        kubeconfig: encodeBase64(getKubeconfig({
          server: seedServerURL,
          name: 'seed.foo.bar'
        }))
      }
    }
    const monitoringSecretResult = {
      data: {
        username: encodeBase64(monitoringUser),
        password: encodeBase64(monitoringPassword)
      }
    }
    const loggingSecretResult = {
      data: {
        username: encodeBase64(loggingUser),
        password: encodeBase64(loggingPassword)
      }
    }

    return [nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, () => shootResult)
      .get(`/api/v1/namespaces/${namespace}/secrets/${name}.kubeconfig`)
      .reply(200, () => kubecfgResult)
      .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`)
      .reply(200, () => isAdminResult)
      .get(`/api/v1/namespaces/garden/secrets/${seedSecretName}`)
      .reply(200, () => seedSecretResult),
    nock(seedServerURL)
      .get(`/api/v1/namespaces/${technicalID}/secrets/monitoring-ingress-credentials`)
      .reply(200, monitoringSecretResult)
      .get(`/api/v1/namespaces/${technicalID}/secrets/logging-ingress-credentials`)
      .reply(200, loggingSecretResult)]
  },
  replaceShoot ({bearer, namespace, name, project, createdBy}) {
    const shoot = getShoot({name, project, createdBy})
    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`)
      .reply(200, () => shoot)
      .put(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        _.assign(shoot, body)
        return true
      })
      .reply(200, () => shoot)
  },
  replaceShootK8sVersion ({bearer, namespace, name, project, createdBy}) {
    const shoot = getShoot({name, project, createdBy})

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        const payload = _.head(body)
        if (payload.op === 'replace' && payload.path === '/spec/kubernetes/version') {
          shoot.spec.kubernetes = _.assign({}, shoot.spec.kubernetes, payload.value)
        }
        return true
      })
      .reply(200, () => shoot)
  },
  replaceWorkers ({bearer, namespace, name, project, workers}) {
    const shoot = getShoot({name, project})
    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        const payload = _.head(body)
        console.log(payload)
        if (payload.op === 'replace' && payload.path === '/spec/cloud/fooInfra/workers') {
          shoot.spec.cloud.fooInfra.workers = workers
        }
        return true
      })
      .reply(200, () => shoot)
  },
  patchShootAnnotations ({ bearer, namespace, name, project, createdBy }) {
    const shoot = getShoot({ name, project, createdBy })

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        shoot.metadata.annotations = Object.assign({}, shoot.metadata.annotations, body.metadata.annotations)
        return true
      })
      .reply(200, () => shoot)
  },
  replaceMaintenance ({bearer, namespace, name, project}) {
    const shoot = getShoot({name, project})

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        shoot.spec.maintenance = body.spec.maintenance
        return true
      })
      .reply(200, () => shoot)
  },
  replaceHibernationSchedules ({ bearer, namespace, name, project }) {
    const shoot = getShoot({name, project})

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        shoot.spec.hibernation.schedules = body.spec.hibernation.schedules
        return true
      })
      .reply(200, () => shoot)
  },
  replaceHibernationEnabled ({ bearer, namespace, name, project }) {
    const shoot = getShoot({name, project})

    return nockWithAuthorization(bearer)
      .patch(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots/${name}`, body => {
        shoot.spec.hibernation.enabled = body.spec.hibernation.enabled
        return true
      })
      .reply(200, () => shoot)
  },
  getInfrastructureSecrets ({bearer, namespace, empty = false}) {
    const secretBindings = !empty
      ? _.filter(secretBindingList, ['metadata.namespace', namespace])
      : []
    const infrastructureSecrets = !empty
      ? _.filter(infrastructureSecretList, ['metadata.namespace', namespace])
      : []
    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/secretbindings`)
      .reply(200, {
        items: secretBindings
      })
      .get(`/api/v1/namespaces/${namespace}/secrets`)
      .reply(200, {
        items: infrastructureSecrets
      })
  },
  createInfrastructureSecret ({bearer, namespace, data, cloudProfileName, resourceVersion = 42}) {
    const {
      resultSecretBinding,
      resultSecret
    } = prepareSecretAndBindingMeta({
      bindingNamespace: namespace,
      data,
      resourceVersion,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .post(`/api/v1/namespaces/${namespace}/secrets`, body => {
        _.assign(resultSecret.metadata, body.metadata)
        return true
      })
      .reply(200, () => resultSecret)
      .post(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/secretbindings`, body => {
        _.assign(resultSecretBinding.metadata, body.metadata)
        _.assign(resultSecretBinding.secretRef, body.secretRef)
        return true
      })
      .reply(200, () => resultSecretBinding)
  },
  patchInfrastructureSecret ({bearer, namespace, name, bindingName, bindingNamespace, data, cloudProfileName, resourceVersion = 42}) {
    const {
      resultSecretBinding,
      resultSecret
    } = prepareSecretAndBindingMeta({
      name,
      namespace,
      data,
      resourceVersion,
      bindingName,
      bindingNamespace,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => resultSecretBinding)
      .patch(`/api/v1/namespaces/${namespace}/secrets/${name}`, body => {
        _.assign(resultSecret.metadata, body.metadata)
        return true
      })
      .reply(200, () => resultSecret)
  },
  patchSharedInfrastructureSecret ({bearer, namespace, name, bindingName, bindingNamespace, data, cloudProfileName, resourceVersion = 42}) {
    const {
      resultSecretBinding
    } = prepareSecretAndBindingMeta({
      name,
      namespace,
      data,
      resourceVersion,
      bindingName,
      bindingNamespace,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => resultSecretBinding)
  },
  deleteInfrastructureSecret ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const shoot = getShoot({name: 'fooShoot', project, bindingName: 'someOtherSecretName'})
    const {
      resultSecretBinding
    } = prepareSecretAndBindingMeta({
      name,
      namespace,
      resourceVersion,
      bindingName,
      bindingNamespace,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => resultSecretBinding)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/shoots`)
      .reply(200, {
        items: [shoot]
      })
      .delete(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200)
      .delete(`/api/v1/namespaces/${bindingNamespace}/secrets/${name}`)
      .reply(200)
  },
  deleteSharedInfrastructureSecret ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const {
      resultSecretBinding
    } = prepareSecretAndBindingMeta({
      name,
      namespace,
      resourceVersion,
      bindingName,
      bindingNamespace,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => resultSecretBinding)
  },
  deleteInfrastructureSecretReferencedByShoot ({bearer, namespace, project, name, bindingName, bindingNamespace, cloudProfileName, resourceVersion = 42}) {
    const referencingShoot = getShoot({name: 'referencingShoot', project, bindingName})
    const shoot = getShoot({name: 'fooShoot', project, bindingName: 'someOtherSecretName'})
    const {
      resultSecretBinding
    } = prepareSecretAndBindingMeta({
      name,
      namespace,
      resourceVersion,
      bindingName,
      bindingNamespace,
      cloudProfileName
    })

    return nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/secretbindings/${bindingName}`)
      .reply(200, () => resultSecretBinding)
      .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${bindingNamespace}/shoots`)
      .reply(200, {
        items: [shoot, referencingShoot]
      })
  },
  getProjects ({bearer}) {
    const scope = nockWithAuthorization(bearer)
    canDeleteShootsInAllNamespaces(scope)
    return [
      scope,
      nockWithAuthorization(auth.bearer)
        .get('/apis/garden.sapcloud.io/v1beta1/projects')
        .reply(200, {
          items: projectList
        })
    ]
  },
  getProject ({bearer, name, namespace, resourceVersion = 42, unauthorized = false}) {
    let statusCode = 200
    let result = _
      .chain(projectList)
      .find(['metadata.name', name])
      .set('metadata.resourceVersion', resourceVersion)
      .value()
    if (unauthorized) {
      statusCode = 403
      result = {
        message: 'Forbidden'
      }
    }
    return [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      nockWithAuthorization(bearer)
        .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
        .reply(statusCode, () => result)
    ]
  },
  createProject ({bearer, resourceVersion = 42}) {
    const result = {
      metadata: {
        resourceVersion
      },
      spec: {},
      status: {
        phase: undefined
      }
    }

    return nockWithAuthorization(bearer)
      .post('/apis/garden.sapcloud.io/v1beta1/projects', body => {
        const namespace = `garden-${body.metadata.name}`
        _
          .chain(result)
          .merge({spec: {namespace}}, body)
          .commit()
        return true
      })
      .reply(200, () => result)
  },
  patchProject ({bearer, namespace, resourceVersion = 43}) {
    const project = readProject(namespace)
    const name = _.get(project, 'metadata.name')
    const newProject = _.cloneDeep(project)

    return [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      nockWithAuthorization(bearer)
        .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
        .reply(200, () => project)
        .patch(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`, body => {
          _.merge(newProject, body)
          return true
        })
        .reply(200, () => _.set(newProject, 'metadata.resourceVersion', resourceVersion))
    ]
  },
  deleteProject ({bearer, namespace}) {
    let project = readProject(namespace)
    const name = _.get(project, 'metadata.name')
    const confirmationPath = ['metadata', 'annotations', 'confirmation.garden.sapcloud.io/deletion']
    return [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      nockWithAuthorization(bearer)
        .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`)
        .reply(200, {
          items: []
        })
        .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
        .reply(200, () => project)
        .patch(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`, body => {
          return _.get(body, confirmationPath) === 'true'
        })
        .reply(200, () => _.set(project, confirmationPath, 'true'))
        .delete(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
        .reply(200, () => project)
    ]
  },
  getMembers ({bearer, namespace}) {
    const project = readProject(namespace)
    if (project) {
      return [
        nockWithAuthorization(auth.bearer)
          .get(`/api/v1/namespaces/${namespace}`)
          .reply(200, () => getProjectNamespace(namespace)),
        nockWithAuthorization(bearer)
          .get(`/apis/garden.sapcloud.io/v1beta1/projects/${project.metadata.name}`)
          .reply(200, () => project)
      ]
    }
    return nockWithAuthorization(auth.bearer)
      .get(`/api/v1/namespaces/${namespace}`)
      .reply(404, () => {
        return {
          message: 'Namespace not found'
        }
      })
  },
  addMember ({bearer, namespace, name: username}) {
    const project = readProject(namespace)
    const newProject = _.cloneDeep(project)
    const name = project.metadata.name

    const scope = nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
      .reply(200, () => project)
    if (!_.find(project.spec.members, ['name', username])) {
      scope
        .patch(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`, body => {
          if (!_.find(body.spec.members, ['name', username])) {
            return false
          }
          newProject.spec.members = body.spec.members
          return true
        })
        .reply(200, () => newProject)
    }
    return [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      scope
    ]
  },
  removeMember ({bearer, namespace, name: username}) {
    const project = readProject(namespace)
    const newProject = _.cloneDeep(project)
    const name = project.metadata.name

    const scope = nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
      .reply(200, () => project)
    if (_.find(project.spec.members, ['name', username])) {
      scope
        .patch(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`, body => {
          if (_.find(body.spec.members, ['name', username])) {
            return false
          }
          newProject.spec.members = body.spec.members
          return true
        })
        .reply(200, () => newProject)
    }
    return [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      scope
    ]
  },
  getMember ({bearer, namespace, name: username}) {
    const project = readProject(namespace)
    const name = project.metadata.name
    const isMember = _.findIndex(project.spec.members, ['name', username]) !== -1
    const scope = nockWithAuthorization(bearer)
      .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
      .reply(200, () => project)
    const scopes = [
      nockWithAuthorization(auth.bearer)
        .get(`/api/v1/namespaces/${namespace}`)
        .reply(200, () => getProjectNamespace(namespace)),
      scope
    ]
    const [, serviceAccountNamespace, serviceAccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
    if (serviceAccountNamespace === namespace && isMember) {
      const serviceAccount = _.find(serviceAccountList, ({metadata}) => metadata.name === serviceAccountName && metadata.namespace === namespace)
      const serviceAccountSecretName = _.first(serviceAccount.secrets).name
      const serviceAccountSecret = _.find(serviceAccountSecretList, ({metadata}) => metadata.name === serviceAccountSecretName && metadata.namespace === namespace)
      scope
        .get(`/api/v1/namespaces/${namespace}/serviceaccounts/${serviceAccountName}`)
        .reply(200, serviceAccount)
        .get(`/api/v1/namespaces/${namespace}/secrets/${serviceAccountSecretName}`)
        .reply(200, serviceAccountSecret)
    }
    return scopes
  },
  healthz () {
    return nockWithAuthorization(auth.bearer)
      .get(`/healthz`)
      .reply(200, 'ok')
  },
  fetchGardenerVersion ({ version }) {
    const service = {
      name: 'gardener-apiserver',
      namespace: 'gardener'
    }
    const caBundle = encodeBase64('ca')
    const body = { spec: { service, caBundle } }
    const serviceUrl = `https://${service.name}.${service.namespace}`
    const statusCode = !version ? 404 : 200
    return [
      nockWithAuthorization(auth.bearer)
        .get('/apis/apiregistration.k8s.io/v1/apiservices/v1beta1.garden.sapcloud.io')
        .reply(200, body),
      nock(serviceUrl)
        .get(`/version`)
        .reply(statusCode, version)
    ]
  },
  getUserInfo ({ bearer }) {
    const scope = nockWithAuthorization(bearer)
    canDeleteShootsInAllNamespaces(scope)
    canCreateProjects(scope)
    const adminScope = nockWithAuthorization(auth.bearer)
    reviewToken(adminScope)
    return [ scope, adminScope ]
  }
}

module.exports = {
  url,
  projectList,
  getProject,
  getShoot,
  readProject,
  readProjectMembers,
  auth,
  stub
}
