//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'
import { getJoinedRooms } from '../io/seedstats.js'

export default (io, informer) => {
  const nsp = io.of('/')

  const handleEvent = (type, newObject) => {
    const uid = get(newObject, ['metadata', 'uid'])
    const seedName = get(newObject, ['metadata', 'name'])
    const event = { uid, type }
    nsp.to('seeds').emit('seeds', event)

    for (const room of getJoinedRooms(nsp, { seedName })) {
      nsp.to(room.room).emit('seedstats', event)
    }
  }

  informer.on('add', object => handleEvent('ADDED', object))
  informer.on('update', (object, oldObject) => handleEvent('MODIFIED', object, oldObject))
  informer.on('delete', object => handleEvent('DELETED', object))
}
