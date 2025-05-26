//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import { isMemberOf, simplifyProject } from '../utils/index.js'
import { constants, getUserFromSocket, synchronizeFactory } from './helper.js'

export const synchronize = synchronizeFactory('Project', {
  group: 'core.gardener.cloud',
  accessResolver (socket, object) {
    const user = getUserFromSocket(socket)
    return get(user, ['profiles', 'canListProjects'], false) || isMemberOf(object, user)
      ? constants.OBJECT_SIMPLE
      : constants.OBJECT_NONE
  },
  simplifyObject: simplifyProject,
})
