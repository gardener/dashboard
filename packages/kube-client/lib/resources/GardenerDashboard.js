//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { GardenerDashboard } from '../groups.js'
import { NamespaceScoped, Readable, Writable, Observable } from '../mixins.js'

class Terminal extends mix(GardenerDashboard).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'terminals',
      singular: 'terminal',
      kind: 'Terminal',
    }
  }
}

export default {
  Terminal,
}
