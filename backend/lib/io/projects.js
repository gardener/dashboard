//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get } = require('lodash')
const {
  isMemberOf,
  simplifyProject,
} = require('../utils')
const {
  constants,
  getUserFromSocket,
  synchronizeFactory,
} = require('./helper')

module.exports = {
  synchronize: synchronizeFactory('Project', {
    group: 'core.gardener.cloud',
    accessResolver (socket, object) {
      const user = getUserFromSocket(socket)
      return get(user, ['profiles', 'canListProjects'], false) || isMemberOf(object, user)
        ? constants.OBJECT_SIMPLE
        : constants.OBJECT_NONE
    },
    simplifyObject: simplifyProject,
  }),
}
