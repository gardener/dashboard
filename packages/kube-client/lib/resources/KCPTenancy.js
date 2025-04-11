//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { KCPTenancy } = require('../groups')
const { ClusterScoped, Readable, Writable, Observable } = require('../mixins')

class Workspace extends mix(KCPTenancy).with(ClusterScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'workspaces',
      singular: 'workspace',
      kind: 'Workspace',
    }
  }
}

module.exports = {
  Workspace,
}
