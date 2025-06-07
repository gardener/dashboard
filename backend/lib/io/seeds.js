//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get } = require('lodash')
const {
  simplifySeed,
} = require('../utils')
const {
  constants,
  getUserFromSocket,
  synchronizeFactory,
} = require('./helper')

module.exports = {
  synchronize: synchronizeFactory('Seed', {
    group: 'core.gardener.cloud',
    accessResolver (socket, object) {
      const user = getUserFromSocket(socket)
      return get(user, ['profiles', 'canListSeeds'], false)
        ? constants.OBJECT_SIMPLE
        : constants.OBJECT_NONE
    },
    simplifyObject: simplifySeed,
  }),
}
