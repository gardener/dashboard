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

const _ = require('lodash')
const nock = require('nock')

const { clientConfig } = require('../../../lib/kubernetes')

const url = clientConfig.url
const auth = clientConfig.auth

const seedList = [
  getSeed('aws', 'eu-west-1'),
  getSeed('aws', 'eu-central-1'),
  getSeed('google', 'europe-west1')
]

const projectList = [
  getProject('foo', 'foo@example.org', 'bar@example.org', 'foo-description', 'foo-purpose'),
  getProject('bar', 'bar@example.org', 'foo@example.org', 'bar-description', 'bar-purpose'),
  getProject('secret', 'admin@example.org', 'admin@example.org', 'secret-description', 'secret-purpose')
]

const projectMembersList = [
  getProjectMembers('garden-foo', ['foo@example.org', 'bar@example.org']),
  getProjectMembers('garden-bar', ['bar@example.org', 'foo@example.org']),
  getProjectMembers('garden-secret', ['admin@example.org'])
]

function getSeed (kind, region) {
  return {
    metadata: {
      name: `${kind}---${region}`,
      labels: {
        'infrastructure.garden.sapcloud.io/kind': kind,
        'infrastructure.garden.sapcloud.io/region': region
      }
    }
  }
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
      name: 'garden-project-member'
    },
    subjects: _.map(users, name => {
      return {
        apiGroup,
        kind: 'User',
        name
      }
    })
  }
}

function getProject (name, owner, createdBy, description, purpose) {
  return {
    metadata: {
      name: `garden-${name}`,
      labels: {
        'garden.sapcloud.io/role': 'project',
        'project.garden.sapcloud.io/name': name
      },
      annotations: {
        'project.garden.sapcloud.io/createdBy': createdBy,
        'project.garden.sapcloud.io/owner': owner,
        'project.garden.sapcloud.io/description': description,
        'project.garden.sapcloud.io/purpose': purpose
      }
    }
  }
}

const stub = {
  getSeeds ({bearer = auth.bearer} = {}) {
    return nock(url)
      .matchHeader('authorization', new RegExp(`bearer ${bearer}`, 'i'))
      .get('/api/v1/namespaces/garden/secrets')
      .query({
        labelSelector: 'garden.sapcloud.io/role=seed'
      })
      .reply(200, {
        items: seedList
      })
  },
  getProjects () {
    const reqheaders = {
      authorization: `Bearer ${auth.bearer}`
    }
    const subject = {
      kind: 'User',
      name: 'admin@example.org'
    }
    const subjects = [subject]
    return nock(url, {reqheaders})
      .get('/api/v1/namespaces')
      .query({
        labelSelector: 'garden.sapcloud.io/role=project'
      })
      .reply(200, {
        items: projectList
      })
      .get('/apis/rbac.authorization.k8s.io/v1beta1/rolebindings')
      .query({
        labelSelector: 'garden.sapcloud.io/role=members'
      })
      .reply(200, {
        items: projectMembersList
      })
      .get('/apis/rbac.authorization.k8s.io/v1beta1/clusterrolebindings/garden-administrators')
      .reply(200, {subjects})
  },
  createProject ({namespace, username, resourceVersion = 42}) {
    const bearer = auth.bearer
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const roleBindingsUrl = `/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings`
    const metadata = {
      resourceVersion
    }
    const result = {metadata}

    function matchRolebindingProjectMembers ({metadata, roleRef, subjects: [subject]}) {
      return metadata.name === 'garden-project-members' &&
        roleRef.name === 'garden-project-member' &&
        subject.name === username
    }

    function matchRolebindingTerraformers ({metadata, roleRef, subjects: [subject]}) {
      return metadata.name === 'garden-terraformers' &&
        roleRef.name === 'garden-terraformer' &&
        subject.namespace === namespace
    }

    return nock(url, {reqheaders})
      .post(roleBindingsUrl, matchRolebindingProjectMembers)
      .reply(200)
      .post(roleBindingsUrl, matchRolebindingTerraformers)
      .reply(200)
      .post('/api/v1/namespaces', body => {
        _.assign(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  patchProject ({namespace, username, resourceVersion = 43}) {
    const bearer = auth.bearer
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    const result = _
      .chain(projectList)
      .find(({metadata}) => metadata.name === namespace)
      .set('metadata.resourceVersion', resourceVersion)
      .value()
    const {metadata} = result
    return nock(url, {reqheaders})
      .patch(`/api/v1/namespaces/${namespace}`, body => {
        _.merge(metadata, body.metadata)
        return true
      })
      .reply(200, () => result)
  },
  deleteProject ({namespace, username}) {
    const bearer = auth.bearer
    const reqheaders = {
      authorization: `Bearer ${bearer}`
    }
    return nock(url, {reqheaders})
      .get(`/apis/garden.sapcloud.io/v1/namespaces/${namespace}/shoots`)
      .reply(200, {
        items: []
      })
      .get(`/apis/rbac.authorization.k8s.io/v1beta1/namespaces/${namespace}/rolebindings/garden-project-members`)
      .reply(200, getProjectMembers(namespace, [username, 'foo@example.org']))
      .delete(`/api/v1/namespaces/${namespace}`)
      .reply(200)
  }
}
module.exports = {
  url,
  projectList,
  projectMembersList,
  seedList,
  auth,
  stub
}
