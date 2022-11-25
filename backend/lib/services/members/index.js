//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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

exports.resetServiceAccount = async function ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  await memberManager.resetServiceAccount(name)
}
