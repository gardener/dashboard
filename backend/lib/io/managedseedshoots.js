//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import cache from '../cache/index.js'
import { simplifyManagedSeedShoot } from '../utils/index.js'
import helper from './helper.js'

const { constants, getUserFromSocket, synchronizeFactory } = helper

const synchronize = synchronizeFactory('Shoot', {
  group: 'core.gardener.cloud',
  accessResolver (socket, shoot) {
    const user = getUserFromSocket(socket)
    const canAccess = get(user, ['profiles', 'canGetManagedSeedAndShootInGardenNs'], false)
    if (!canAccess) {
      return constants.OBJECT_NONE
    }

    // Validate that this shoot is in the garden namespace and corresponds to a managed seed
    const { namespace, name } = shoot.metadata
    if (namespace !== 'garden') {
      return constants.OBJECT_NONE
    }

    const managedSeed = cache.getManagedSeedForShootInGardenNamespace(name)
    if (!managedSeed) {
      return constants.OBJECT_NONE
    }

    return constants.OBJECT_SIMPLE
  },
  simplifyObject: simplifyManagedSeedShoot,
})

export {
  synchronize,
}
