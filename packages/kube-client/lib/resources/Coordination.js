//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { Coordination } from '../groups.js'
import { NamespaceScoped, Readable, Observable, Writable } from '../mixins.js'

class Lease extends mix(Coordination).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'leases',
      singular: 'lease',
      kind: 'Lease',
    }
  }
}

export default {
  Lease,
}
