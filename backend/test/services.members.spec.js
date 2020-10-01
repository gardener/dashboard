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

const {
  normalizedMembersFromProject
} = require('../lib/services/members')

const _ = require('lodash')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  describe('members', function () {

    const members = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'foo@bar.com',
        role: 'admin',
        roles: [
          'owner'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'mutiple@bar.com',
        role: 'admin',
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-sa',
        namespace: 'garden-lukas',
        role: 'admin',
        roles: [
          'myrole',
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'mutiple@bar.com',
        role: 'admin',
        roles: [
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-lukas:robot-user',
        role: 'admin'
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-lukas:robot-multiple',
        role: 'otherrole'
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-multiple',
        namespace: 'garden-lukas',
        role: 'admin',
        roles: [
          'myrole',
        ]
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-multiple',
        namespace: 'garden-lukas',
        role: 'myrole',
        roles: [
          'viewer'
        ]
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-foreign-namespace',
        namespace: 'garden-foreign',
        role: 'myrole',
        roles: [
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foreign:robot-foreign-namespace',
        role: 'admin'
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-other-foreign:robot-other-foreign-namespace',
        role: 'otherrole'
      }
    ]

    describe('#normalizedMembersFromProject', function () {
      const normalizedMembers = normalizedMembersFromProject({ spec: { members } })

      it('should merge role, roles into roles', async function () {
        const memberRoles = _.find(normalizedMembers, { username: 'foo@bar.com' }).roles
        expect(memberRoles).to.have.length(2)
        expect(memberRoles).to.have.deep.members([ 'admin', 'owner' ])
      })

      it('should normalize kind service account to kind user with service account prefix', async function () {
        expect(normalizedMembers).to.deep.contain({ username: 'system:serviceaccount:garden-lukas:robot-sa', roles: [ 'admin', 'myrole', 'viewer' ] })
      })

      it('should not normalize service account that already has prefix', async function () {
        expect(normalizedMembers).to.deep.contain({ username: 'system:serviceaccount:garden-lukas:robot-user', roles: [ 'admin' ] })
      })

      it('should merge multiple occurences of same user in members list', async function () {
        // merge all roles
        // do not merge service accounts from different namespaces
        expect(normalizedMembers).to.have.length(7)
        expect(normalizedMembers).to.deep.contain({ username: 'mutiple@bar.com', roles: [ 'admin', 'viewer' ] })
        expect(normalizedMembers).to.deep.contain({ username: 'system:serviceaccount:garden-lukas:robot-multiple', roles: ['otherrole', 'admin', 'myrole', 'viewer' ] })
        expect(normalizedMembers).to.deep.contain({ username: 'system:serviceaccount:garden-foreign:robot-foreign-namespace', roles: ['myrole', 'viewer', 'admin' ] })
      })
    })
  })
})
