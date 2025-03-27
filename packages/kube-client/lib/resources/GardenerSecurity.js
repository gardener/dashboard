//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { GardenerSecurity } = require('../groups')
const { NamespaceScoped, Readable, Writable, Observable } = require('../mixins')

class CredentialsBinding extends mix(GardenerSecurity).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'credentialsbindings',
      singular: 'credentialsbinding',
      kind: 'CredentialsBinding',
    }
  }
}

class WorkloadIdentity extends mix(GardenerSecurity).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'workloadidentities',
      singular: 'workloadidentity',
      kind: 'WorkloadIdentity',
    }
  }
}

module.exports = {
  CredentialsBinding,
  WorkloadIdentity,
}
