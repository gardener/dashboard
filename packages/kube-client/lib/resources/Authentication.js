//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { Authentication } from '../groups.js'
import { ClusterScoped, Creatable } from '../mixins.js'

class TokenReview extends mix(Authentication).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'tokenreviews',
      singular: 'tokenreview',
      kind: 'TokenReview',
    }
  }
}

export default {
  TokenReview,
}
