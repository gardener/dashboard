//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { pick } from 'lodash-es'

const PROPERTY_NAMES = Object.freeze([
  'createdBy',
  'creationTimestamp',
  'deletionTimestamp',
  'description',
  'kubeconfig',
  'orphaned',
])

class Member {
  constructor (username, { roles, extensions } = {}) {
    this.username = username
    this.roles = roles
    Object.assign(this, pick(extensions, PROPERTY_NAMES))
  }

  static parseUsername (username) {
    const [, namespace, name] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
    if (namespace && name) {
      return {
        kind: 'ServiceAccount',
        namespace,
        name,
      }
    }
    return {
      kind: 'User',
      apiGroup: 'rbac.authorization.k8s.io',
      name: username,
    }
  }

  static get allowedExtensionProperties () {
    return PROPERTY_NAMES
  }
}

export default Member
