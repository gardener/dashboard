//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const constants = {
  KUBERNETES_SERVICEACCOUNT_TOKEN_FILE: '/var/run/secrets/kubernetes.io/serviceaccount/token',
  KUBERNETES_SERVICEACCOUNT_CA_FILE: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
}

Object.assign(exports, constants)
Object.freeze(exports)
