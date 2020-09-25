//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')

const PROPERTY_NAMES = ['createdBy', 'creationTimestamp', 'description', 'kubeconfig']

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
        name
      }
    }
    return {
      kind: 'User',
      apiGroup: 'rbac.authorization.k8s.io',
      name: username
    }
  }
}

module.exports = Member
