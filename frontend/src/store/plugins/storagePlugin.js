//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default function (storage) {
  return store => {
    // initialize store
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      const value = storage.getItem(key)
      store.commit('storage/SET_ITEM', [key, value])
    }
    // listen for storage changes within the context of another document
    window.addEventListener('storage', e => {
      const { key, newValue, oldValue, storageArea } = e
      if (storage.equals(storageArea)) {
        storage.emit('change', key, newValue, oldValue)
        if (key === null) {
          store.commit('storage/CLEAR')
        } else if (newValue === null) {
          store.commit('storage/REMOVE_ITEM', key)
        } else {
          store.commit('storage/SET_ITEM', [key, newValue])
        }
      }
    })
    // update storage when store state has been modified
    store.subscribe(mutation => {
      switch (mutation.type) {
        case 'storage/CLEAR': {
          storage.clear()
          break
        }
        case 'storage/SET_ITEM': {
          const [key, newValue] = mutation.payload
          storage.setItem(key, newValue)
          break
        }
        case 'storage/REMOVE_ITEM': {
          const key = mutation.payload
          storage.removeItem(key)
          break
        }
      }
    })
  }
}
