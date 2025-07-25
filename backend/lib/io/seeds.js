//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import { simplifySeed } from '../utils/index.js'
import helper from './helper.js'

const { constants, getUserFromSocket, synchronizeFactory } = helper

const synchronize = synchronizeFactory('Seed', {
  group: 'core.gardener.cloud',
  accessResolver (socket, object) {
    const user = getUserFromSocket(socket)
    return get(user, ['profiles', 'canListSeeds'], false)
      ? constants.OBJECT_SIMPLE
      : constants.OBJECT_NONE
  },
  simplifyObject: simplifySeed,
})

export {
  synchronize,
}
