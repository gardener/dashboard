//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { GardenerSeedManagement } = require('../groups')
const { NamespaceScoped, Readable, Writable, Observable } = require('../mixins')

class SeedManagement extends mix(GardenerSeedManagement).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'managedseeds',
      singular: 'managedseed',
      kind: 'ManagedSeed',
    }
  }
}

module.exports = {
  SeedManagement,
}
