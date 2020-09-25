//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { Authentication } = require('../groups')
const { ClusterScoped, Creatable } = require('../mixins')

class TokenReview extends mix(Authentication).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'tokenreviews',
      singular: 'tokenreview',
      kind: 'TokenReview'
    }
  }
}

module.exports = {
  TokenReview
}
