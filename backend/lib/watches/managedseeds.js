//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'

import cache from '../cache/index.js'

export default (io, informer) => {
  const nsp = io.of('/')

  const handleEvent = (type, newObject, oldObject) => {
    const object = newObject ?? oldObject
    if (get(object, ['metadata', 'namespace']) !== 'garden') {
      return
    }
    const uid = get(object, ['metadata', 'uid'])
    const event = { uid, type }
    nsp.to('managedseeds;garden').emit('managedseeds', event)

    // Backfill the managed seed shoot once the ManagedSeed is ADDED to ensure
    // the frontend can fetch it immediately instead of waiting for a later
    // MODIFIED event on the shoot if that shoot event was processed before the
    // ManagedSeed association reached the cache.
    if (type === 'ADDED') {
      const shootName = get(object, ['spec', 'shoot', 'name'])
      if (!shootName) {
        return
      }

      const shoot = cache.getShoot('garden', shootName)
      const shootUid = get(shoot, ['metadata', 'uid'])
      if (!shootUid) {
        return
      }

      nsp.to('managedseed-shoots;garden').emit('managedseed-shoots', { type, uid: shootUid })
    }
  }

  informer.on('add', object => handleEvent('ADDED', object))
  informer.on('update', (object, oldObject) => handleEvent('MODIFIED', object, oldObject))
  informer.on('delete', object => handleEvent('DELETED', object))
}
