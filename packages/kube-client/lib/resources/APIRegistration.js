//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { APIRegistration } = require('../groups')
const { ClusterScoped, Readable } = require('../mixins')

class APIService extends mix(APIRegistration).with(ClusterScoped, Readable) {
  static get names () {
    return {
      plural: 'apiservices',
      singular: 'apiservice',
      kind: 'APIService'
    }
  }
}

module.exports = {
  APIService
}
