//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { GardenerAuthentication } = require('../groups')

class AdminKubeconfigRequest extends mix(GardenerAuthentication).with() {
  static get names () {
    return {
      kind: 'AdminKubeconfigRequest'
    }
  }
}

module.exports = {
  AdminKubeconfigRequest
}
