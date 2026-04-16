//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import testUtils from '@gardener-dashboard/test-utils'

const { encodeBase64, decodeBase64, randomNumber } = testUtils.helper

function getCertificate (payload = '...') {
  return [
    '-----BEGIN CERTIFICATE-----',
    encodeBase64(payload),
    '-----END CERTIFICATE-----',
  ].join('\n')
}

function getPrivateKey (payload = '...') {
  return [
    '-----BEGIN RSA PRIVATE KEY-----',
    encodeBase64(payload),
    '-----END RSA PRIVATE KEY-----',
  ].join('\n')
}

export {
  encodeBase64,
  decodeBase64,
  getCertificate,
  getPrivateKey,
  randomNumber,
}
