//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import { simplifyManagedSeed } from '../utils/index.js'
import helper from './helper.js'

const { constants, getUserFromSocket, synchronizeFactory } = helper

const synchronize = synchronizeFactory('ManagedSeed', {
  group: 'seedmanagement.gardener.cloud',
  accessResolver (socket, object) {
    const user = getUserFromSocket(socket)

    if (!get(user, ['profiles', 'canGetManagedSeedAndShootInGardenNs'], false)) {
      return constants.OBJECT_NONE
    }

    // Access is garden-scoped via profile computation/informer setup, and we
    // keep this namespace check as a sanity check in case wiring changes
    // later.
    if (get(object, ['metadata', 'namespace']) !== 'garden') {
      return constants.OBJECT_NONE
    }

    return constants.OBJECT_SIMPLE
  },
  simplifyObject: simplifyManagedSeed,
})

export {
  synchronize,
}
