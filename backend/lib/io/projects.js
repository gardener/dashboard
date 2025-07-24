//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import {
  isMemberOf,
  simplifyProject,
} from '../utils/index.js'
import helper from './helper.js'

export const synchronize = helper.synchronizeFactory('Project', {
  group: 'core.gardener.cloud',
  accessResolver (socket, object) {
    const user = helper.getUserFromSocket(socket)
    return get(user, ['profiles', 'canListProjects'], false) || isMemberOf(object, user)
      ? helper.constants.OBJECT_SIMPLE
      : helper.constants.OBJECT_NONE
  },
  simplifyObject: simplifyProject,
})
