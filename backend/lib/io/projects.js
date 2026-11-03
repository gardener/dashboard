//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import {
  projectVisibilityFilter,
  simplifyProject,
} from '../utils/index.js'
import helper from './helper.js'

export const synchronize = helper.synchronizeFactory('Project', {
  group: 'core.gardener.cloud',
  accessResolver (socket, object) {
    const user = helper.getUserFromSocket(socket)
    const canListProjects = get(user, ['profiles', 'canListProjects'], false)
    return projectVisibilityFilter(user, canListProjects)(object)
      ? helper.constants.OBJECT_SIMPLE
      : helper.constants.OBJECT_NONE
  },
  simplifyObject: simplifyProject,
})
