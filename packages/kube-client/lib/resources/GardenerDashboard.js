//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { GardenerDashboard } = require('../groups')
const { NamespaceScoped, Readable, Writable, Observable } = require('../mixins')

class Terminal extends mix(GardenerDashboard).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'terminals',
      singular: 'terminal',
      kind: 'Terminal'
    }
  }
}

module.exports = {
  Terminal
}
