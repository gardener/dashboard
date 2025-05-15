//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

class ListWatcher {
  constructor (listFunc, watchFunc, { group, version, names }, query) {
    this.listFunc = listFunc
    this.watchFunc = watchFunc
    Object.assign(this, { group, version, names })
    this.searchParams = new URLSearchParams(query)
    this.signal = undefined
  }

  setAbortSignal (signal) {
    this.signal = signal
  }

  mergeSearchParams (query = {}) {
    const searchParams = new URLSearchParams(this.searchParams)
    for (const [key, value] of Object.entries(query)) {
      searchParams.set(key, value)
    }
    return searchParams
  }

  watch (query) {
    const searchParams = this.mergeSearchParams(query)
    const options = { searchParams }
    if (this.signal) {
      options.signal = this.signal
    }
    return this.watchFunc(options)
  }

  list (query) {
    const searchParams = this.mergeSearchParams(query)
    const options = { searchParams }
    return this.listFunc(options)
  }
}

export default ListWatcher
