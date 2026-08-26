//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { APIRegistration } from '../groups.js'
import { ClusterScoped, Readable } from '../mixins.js'

class APIService extends mix(APIRegistration).with(ClusterScoped, Readable) {
  static get names () {
    return {
      plural: 'apiservices',
      singular: 'apiservice',
      kind: 'APIService',
    }
  }
}

export default {
  APIService,
}
