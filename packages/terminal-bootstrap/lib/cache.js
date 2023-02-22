//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

class Cache extends Map {
  getSeeds () {
    return this.get('seeds').list()
  }

  getSeed (name) {
    return _
      .chain(this.getSeeds())
      .find(['metadata.name', name])
      .cloneDeep()
      .value()
  }

  getShoots () {
    return this.get('shoots').list()
  }

  initialize (informers) {
    for (const [key, informer] of Object.entries(informers)) {
      this.set(key, informer.store)
    }
  }
}

module.exports = new Cache()
