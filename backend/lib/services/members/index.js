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

const MemberManager = require('./MemberManager')

exports.list = async function ({ user, namespace }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.list()
}

exports.get = async function ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.get(name)
}

exports.create = async function ({ user, namespace, body: { name, ...data } }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.create(name, data)
}

exports.update = async function ({ user, namespace, name, body: data }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.update(name, data)
}

exports.remove = async function ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.delete(name)
}

exports.removeSecret = async function ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.deleteSecret(name)
}
