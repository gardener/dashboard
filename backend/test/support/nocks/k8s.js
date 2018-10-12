//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const { credentials } = require('../../../lib/kubernetes')
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
  getProject('foo', 'foo@example.org', 'bar@example.org', 'foo-description', 'foo-purpose'),
  getProject('bar', 'bar@example.org', 'foo@example.org', 'bar-description', 'bar-purpose'),
  getProject('secret', 'admin@example.org', 'admin@example.org', 'secret-description', 'secret-purpose')
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

const projectMembersList = [
  getProjectMembers('garden-foo', ['foo@example.org', 'bar@example.org', 'system:serviceaccount:garden-foo:robot']),
  getProjectMembers('garden-bar', ['bar@example.org', 'foo@example.org']),
  getProjectMembers('garden-secret', ['admin@example.org'])
]

const serviceAccountList = [
  getServiceAccount('garden-foo', 'robot-foo'),
  getServiceAccount('garden-bar', 'robot-bar')
]

const serviceAccountSecretList = [
  getServiceAccountSecret('garden-foo', 'robot-foo'),
  getServiceAccountSecret('garden-bar', 'robot-bar')
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

function validateCanDeleteShootsInAllNamespacesRequest (selfSubjectAccessReview) {
  const {namespace, verb, resource, group} = selfSubjectAccessReview.spec.resourceAttributes
  return !namespace && group === 'garden.sapcloud.io' && resource === 'shoots' && verb === 'delete'
}

function canDeleteShootsInAllNamespacesReply (uri, selfSubjectAccessReview) {
  const [, token] = _.split(this.req.headers.authorization, ' ', 2)
  const payload = jwt.decode(token)
  const allowed = _.includes(gardenAdministrators, payload.email)
  return [200, _.assign({}, selfSubjectAccessReview, {status: {allowed}})]
}

function getProjectMembers (namespace, users) {
  const apiGroup = 'rbac.authorization.k8s.io'
  return {
    metadata: {
      name: 'garden-project-members',
      namespace,
      labels: {
        'garden.sapcloud.io/role': 'members'
      }
    },
    roleRef: {
      apiGroup,
      kind: 'ClusterRole',
      name: 'garden.sapcloud.io:system:project-member'
    },
    subjects: _.map(users, getRoleBindingSubject)
  }
}

function getRoleBindingSubject (name) {
  const apiGroup = 'rbac.authorization.k8s.io'
  return {
    apiGroup,
    kind: 'User',
    name
  }
}

function readProjectMembers (namespace) {
  return _
    .chain(projectMembersList)
    .find(['metadata.namespace', namespace])
    .cloneDeep()
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

function getProject (name, owner, createdBy, description, purpose) {
  return {
    metadata: {
      name,
      annotations: {
        'garden.sapcloud.io/createdBy': createdBy
      }
    },
    spec: {
      namespace: `garden-${name}`,
      owner: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: owner
      },
      purpose,
      description
    }
  }
}

function getProjectNamespace ({name, namespace}) {
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
  seed = 'infra1-seed'
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
  getShoot ({bearer, namespace, name, createdBy, purpose, kind, profile, region, bindingName}) {
    const shoot = getShoot({namespace, name, createdBy, purpose, kind, profile, region, bindingName})

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
      .reply(200, monitoringSecretResult)]
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
    return [
      nockWithAuthorization(bearer)
        .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, validateCanDeleteShootsInAllNamespacesRequest)
        .reply(canDeleteShootsInAllNamespacesReply),
      nockWithAuthorization(auth.bearer)
        .get('/apis/garden.sapcloud.io/v1beta1/projects')
        .reply(200, {
          items: projectList
        })
        .get('/apis/rbac.authorization.k8s.io/v1/rolebindings')
        .query({
          labelSelector: 'garden.sapcloud.io/role=members'
        })
        .reply(200, {
          items: projectMembersList
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
        .reply(200, () => getProjectNamespace({name, namespace})),
      nockWithAuthorization(bearer)
        .get(`/apis/garden.sapcloud.io/v1beta1/projects/${name}`)
        .reply(statusCode, () => result)
    ]
  },
  createProject ({bearer, namespace, username, resourceVersion = 42}) {
    const result = {
      metadata: {
        resourceVersion
      }
    }

    return nockWithAuthorization(auth.bearer)
      .post('/apis/garden.sapcloud.io/v1beta1/projects', body => {
        _.assign(result.metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  patchProject ({bearer, namespace, username, resourceVersion = 43}) {
    const roleBinding = readProjectMembers(namespace)
    const result = _
      .chain(projectList)
      .find(['metadata.name', namespace])
      .set('metadata.resourceVersion', resourceVersion)
      .value()

    return [
      nockWithAuthorization(auth.bearer)
        .patch(`/api/v1/namespaces/${namespace}`, body => {
          _.merge(result.metadata, body.metadata)
          return true
        })
        .reply(200, () => result),
      nockWithAuthorization(bearer)
        .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, validateCanDeleteShootsInAllNamespacesRequest)
        .reply(canDeleteShootsInAllNamespacesReply)
        .get(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`)
        .reply(200, roleBinding)
    ]
  },
  deleteProject ({bearer, namespace, username}) {
    const roleBinding = readProjectMembers(namespace)

    return [
      nockWithAuthorization(auth.bearer)
        .delete(`/api/v1/namespaces/${namespace}`)
        .reply(200),
      nockWithAuthorization(bearer)
        .post(`/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, validateCanDeleteShootsInAllNamespacesRequest)
        .reply(canDeleteShootsInAllNamespacesReply)
        .get(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`)
        .reply(200, roleBinding)
        .get(`/apis/garden.sapcloud.io/v1beta1/namespaces/${namespace}/shoots`)
        .reply(200, {
          items: []
        })
    ]
  },
  getMembers ({bearer, namespace}) {
    const roleBinding = readProjectMembers(namespace)

    return nockWithAuthorization(bearer)
      .get(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, roleBinding)
  },
  addMember ({bearer, namespace, name, roleBindingExists}) {
    const roleBinding = readProjectMembers(namespace)

    const scope = nockWithAuthorization(bearer)
      .get(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, roleBinding)
    if (!_.find(roleBinding.subjects, {name, kind: 'User'})) {
      const newRoleBinding = _.cloneDeep(roleBinding)
      newRoleBinding.subjects.push(getRoleBindingSubject(name))
      nockWithAuthorization(auth.bearer)
        .patch(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`, body => {
          newRoleBinding.metadata = body.metadata
          return true
        })
        .reply(200, () => newRoleBinding)
    }
    return scope
  },
  getMember ({bearer, namespace, name}) {
    const scope = nockWithAuthorization(bearer)
    const [, serviceAccountNamespace, serviceAccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(name) || []
    if (serviceAccountNamespace === namespace) {
      const serviceAccount = _.find(serviceAccountList, ({metadata}) => metadata.name === serviceAccountName && metadata.namespace === namespace)
      const serviceAccountSecretName = _.first(serviceAccount.secrets).name
      const serviceAccountSecret = _.find(serviceAccountSecretList, ({metadata}) => metadata.name === serviceAccountSecretName && metadata.namespace === namespace)
      scope
        .get(`/api/v1/namespaces/${namespace}/serviceaccounts/${serviceAccountName}`)
        .reply(200, serviceAccount)
        .get(`/api/v1/namespaces/${namespace}/secrets/${serviceAccountSecretName}`)
        .reply(200, serviceAccountSecret)
    }
    return scope
  },
  removeMember ({bearer, namespace, name}) {
    const roleBinding = readProjectMembers(namespace)

    const scope = nockWithAuthorization(bearer)
      .get(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, roleBinding)
    if (_.find(roleBinding.subjects, {name, kind: 'User'})) {
      const newRoleBinding = _.cloneDeep(roleBinding)
      _.remove(newRoleBinding.subjects, {name, kind: 'User'})
      nockWithAuthorization(auth.bearer)
        .patch(`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/garden-project-members`, body => {
          newRoleBinding.metadata = body.metadata
          return true
        })
        .reply(200, () => newRoleBinding)
    }
    return scope
  },
  healthz () {
    return nockWithAuthorization(auth.bearer)
      .get(`/healthz`)
      .reply(200, 'ok')
  }
}
module.exports = {
  url,
  projectList,
  projectMembersList,
  auth,
  stub
}
