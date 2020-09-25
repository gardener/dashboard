//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isResourceExpired } = require('../ApiErrors')

function initializeList ({ metadata: { resourceVersion, selfLink } }) {
  return {
    metadata: {
      resourceVersion,
      selfLink,
      paginated: false
    },
    items: []
  }
}

// List returns a single list object, but attempts to retrieve smaller chunks from the
// server to reduce the impact on the server. If the chunk attempt fails, it will load
// the full list instead. The Limit field on options, if unset, will default to the page size.
class ListPager {
  constructor (lister, { pageSize = 500, fullListIfExpired = true } = {}) {
    this.lister = lister
    this.pageSize = pageSize
    this.fullListIfExpired = fullListIfExpired
  }

  async list ({ ...options } = {}) {
    if (!options.limit && this.pageSize) {
      options.limit = this.pageSize
    }
    const requestedResourceVersion = options.resourceVersion
    let list

    while (true) {
      let obj
      try {
        obj = await this.lister.list(options)
      } catch (err) {
        // Only fallback to full list if an "Expired" error is returned, FullListIfExpired is true, and
        // the "Expired" error occurred in page 2 or later (since full list is intended to prevent a pager.List from
        // failing when the resource versions is established by the first page request falls out of the compaction
        // during the subsequent list requests).
        if (!isResourceExpired(err) || !this.fullListIfExpired || !options.continue) {
          throw err
        }
        // the list expired while we were processing, fall back to a full list at
        // the requested ResourceVersion.
        delete options.limit
        delete options.continue
        options.resourceVersion = requestedResourceVersion
        const fullList = await this.lister.list(options)
        if (list) {
          fullList.metadata.paginated = list.metadata.paginated
        }
        return fullList
      }

      // encoded continue token
      const continueToken = obj.metadata.continue

      // exit early and return the object we got if we haven't processed any pages
      if (!continueToken && !list) {
        return obj
      }

      // initialize the list
      if (!list) {
        list = initializeList(obj)
      }
      // fill its contents
      list.items = list.items.concat(obj.items)

      // if we have no more items, return the list
      if (!continueToken) {
        return list
      }

      // set the next loop up
      options.continue = continueToken
      // Clear the ResourceVersion on the subsequent List calls to avoid the
      // `specifying resource version is not allowed when using continue` error.
      // See https://github.com/kubernetes/kubernetes/issues/85221#issuecomment-553748143.
      delete options.resourceVersion
      // At this point, result is already paginated.
      list.metadata.paginated = true
    }
  }

  static create (lister, options) {
    return new this(lister, options)
  }
}

module.exports = ListPager
