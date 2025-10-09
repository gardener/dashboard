//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
