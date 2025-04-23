//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { GardenerSeedManagement } from '../groups.js'
import { NamespaceScoped, Readable, Writable, Observable } from '../mixins.js'

class SeedManagement extends mix(GardenerSeedManagement).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'managedseeds',
      singular: 'managedseed',
      kind: 'ManagedSeed',
    }
  }
}

export default {
  SeedManagement,
}
