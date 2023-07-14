//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helper } = require('@gardener-dashboard/test-utils')

function getCertificate (payload = '...') {
  return [
    '-----BEGIN CERTIFICATE-----',
    helper.encodeBase64(payload),
    '-----END CERTIFICATE-----'
  ].join('\n')
}

function getPrivateKey (payload = '...') {
  return [
    '-----BEGIN RSA PRIVATE KEY-----',
    helper.encodeBase64(payload),
    '-----END RSA PRIVATE KEY-----'
  ].join('\n')
}

module.exports = {
  ...helper,
  getCertificate,
  getPrivateKey
}
