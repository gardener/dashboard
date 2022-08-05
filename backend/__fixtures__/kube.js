//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { hash } = require('./helper')

const server = new URL('https://kubernetes:6443')
const scheme = server.protocol.replace(/:$/, '')
const authority = server.host
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
const authorization = `Bearer ${token}`

module.exports = {
  server,
  ':scheme': scheme,
  ':authority': authority,
  authorization,
  getApiServer (namespace, name, ingressDomain) {
    return `k-${hash(name, namespace)}.${ingressDomain}`
  }
}
