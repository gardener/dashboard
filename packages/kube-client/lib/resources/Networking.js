//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { Networking } = require('../groups')
const { NamespaceScoped, Readable, Writable, Observable } = require('../mixins')

class Ingress extends mix(Networking).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'ingresses',
      singular: 'ingress',
      kind: 'Ingress'
    }
  }
}

module.exports = {
  Ingress
}
