//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { hash } = require('./helper')

module.exports = {
  getApiServer (namespace, name, ingressDomain) {
    return `k-${hash(name, namespace)}.${ingressDomain}`
  }
}
