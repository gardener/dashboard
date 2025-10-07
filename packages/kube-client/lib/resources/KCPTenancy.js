//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import { mix } from 'mixwith'

import { KCPTenancy } from '../groups.js'
import { ClusterScoped, Readable, Writable, Observable } from '../mixins.js'

class Workspace extends mix(KCPTenancy).with(ClusterScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'workspaces',
      singular: 'workspace',
      kind: 'Workspace',
    }
  }
}

export default {
  Workspace,
}
