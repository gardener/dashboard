//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { Coordination } = require('../groups')
const { NamespaceScoped, Readable, Observable, Writable } = require('../mixins')

class Lease extends mix(Coordination).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'leases',
      singular: 'lease',
      kind: 'Lease'
    }
  }
}

module.exports = {
  Lease
}
