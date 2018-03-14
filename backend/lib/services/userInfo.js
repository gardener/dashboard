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

const { includes, filter, map } = require('lodash')
const kubernetes = require('../kubernetes')

function Rbac () {
  return kubernetes.rbac()
}

async function readGardenAdministratorsClusterRoleBinding () {
  const emptyClusterRoleBinding = {
    subjects: []
  }
  return Rbac().clusterrolebindings('garden-administrators').get()
    .catch(err => {
      if (err.code === 404) {
        return emptyClusterRoleBinding
      }
      throw err
    })
}

const isAdminFunction = async function ({user}) {
  const adminCrb = await readGardenAdministratorsClusterRoleBinding()
  const admins = map(filter(adminCrb.subjects, ['kind', 'User']), 'name')
  const isAdmin = includes(admins, user.id)

  return isAdmin
}

exports.isAdmin = isAdminFunction

exports.info = async function ({user}) {
  const isAdmin = await isAdminFunction({user})
  return {isAdmin}
}
