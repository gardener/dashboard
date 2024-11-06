//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers } = require('@gardener-dashboard/test-utils')

module.exports = {
  matchers,
  helper: require('./helper'),
  helm: require('./helm'),
  'gardener-dashboard': require('./gardener-dashboard'),
  identity: require('./identity'),
}
