//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { hash } = require('./helper')
const { url, auth } = require('@gardener-dashboard/kube-config').load({ NODE_ENV: 'test' })

const server = new URL(url)
const scheme = server.protocol.replace(/:$/, '')
const authority = server.host
const authorization = `Bearer ${auth.bearer}`

module.exports = {
  server,
  ':scheme': scheme,
  ':authority': authority,
  authorization,
  getApiServer (namespace, name, ingressDomain) {
    return `k-${hash(name, namespace)}.${ingressDomain}`
  }
}
