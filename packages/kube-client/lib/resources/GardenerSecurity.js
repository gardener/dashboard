//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'

import { GardenerSecurity } from '../groups.js'
import { NamespaceScoped, Readable, Writable, Observable } from '../mixins.js'

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

export default {
  CredentialsBinding,
  WorkloadIdentity,
}
