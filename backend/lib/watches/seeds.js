//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get } from 'lodash-es'

export default (io, informer) => {
  const nsp = io.of('/')

  const handleEvent = (type, newObject, oldObject) => {
    const path = ['metadata', 'uid']
    const uid = get(newObject, path, get(oldObject, path))
    const event = { uid, type }
    nsp.to('seeds').emit('seeds', event)
  }

  informer.on('add', object => handleEvent('ADDED', object))
  informer.on('update', (object, oldObject) => handleEvent('MODIFIED', object, oldObject))
  informer.on('delete', object => handleEvent('DELETED', object))
}
