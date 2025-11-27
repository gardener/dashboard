//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import MemberManager from './MemberManager.js'

export async function list ({ user, namespace }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.list()
}

export async function get ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.get(name)
}

export async function create ({ user, namespace, body: { name, ...data } }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.create(name, data)
}

export async function update ({ user, namespace, name, body: data }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.update(name, data)
}

export async function remove ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.delete(name)
}

export async function resetServiceAccount ({ user, namespace, name }) {
  const memberManager = await MemberManager.create(user, namespace)
  return memberManager.resetServiceAccount(name)
}
