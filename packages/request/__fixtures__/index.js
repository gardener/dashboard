//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const crypto = require('crypto')
const { matchers, helper } = require('@gardener-dashboard/test-utils')

function sha1Hash (data, length = 7) {
  return crypto
    .createHash('sha1')
    .update(data)
    .digest('hex')
    .substring(0, length)
}

module.exports = {
  helper: {
    sha1Hash,
    ...helper,
  },
  matchers,
}
