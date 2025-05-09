//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { Networking } from '../groups.js'
import { NamespaceScoped, Readable, Writable, Observable } from '../mixins.js'

class Ingress extends mix(Networking).with(NamespaceScoped, Readable, Observable, Writable) {
  static get names () {
    return {
      plural: 'ingresses',
      singular: 'ingress',
      kind: 'Ingress',
    }
  }
}

export default {
  Ingress,
}
