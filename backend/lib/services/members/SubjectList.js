//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

const SubjectListItem = require('./SubjectListItem')

class SubjectList {
  constructor (project, serviceAccounts) {
    const {
      spec: {
        namespace,
        members: subjects
      }
    } = project
    const createServiceAccountItem = ({ metadata, secrets }) => {
      const { namespace, name, annotations = {}, creationTimestamp, deletionTimestamp } = metadata
      const createdByTerminal = annotations['terminal.dashboard.gardener.cloud/created-by']
      const createdBy = annotations['dashboard.gardener.cloud/created-by'] || createdByTerminal
      const description = annotations['dashboard.gardener.cloud/description']
      const item = SubjectListItem.create({
        kind: 'ServiceAccount',
        namespace,
        name
      })
      item.extend({
        createdBy,
        description,
        creationTimestamp,
        deletionTimestamp,
        secrets
      })
      return item
    }

    const createItem = (...args) => SubjectListItem.create(...args)

    const createGroup = items => {
      return items.length > 1
        ? SubjectListItem.create(items)
        : items[0]
    }

    const extendItem = item => {
      const id = item.id
      if (_.startsWith(id, `system:serviceaccount:${namespace}:`)) {
        const extensions = {}
        if (serviceAccountItems[id]) {
          _.assign(extensions, serviceAccountItems[id].extensions)
          delete serviceAccountItems[id]
        } else {
          _.set(extensions, 'orphaned', true)
        }
        item.extend(extensions)
      }
    }

    const serviceAccountItems = _
      .chain(serviceAccounts)
      .map(createServiceAccountItem)
      .keyBy('id')
      .value()

    this.subjectListItems = _
      .chain(subjects)
      .map(createItem)
      .groupBy('id')
      .mapValues(createGroup)
      .forEach(extendItem)
      .assign(serviceAccountItems)
      .value()
  }

  get subjects () {
    const itemOrGroupItems = item => {
      return Array.isArray(item.items)
        ? item.items
        : item
    }
    return _
      .chain(this.subjectListItems)
      .filter('active')
      .flatMap(itemOrGroupItems)
      .sortBy(['index'])
      .map(item => item.subject)
      .value()
  }

  get members () {
    return _.map(this.subjectListItems, 'member')
  }

  get (id) {
    return this.subjectListItems[id]
  }

  set (id, item) {
    this.subjectListItems[id] = item
  }

  delete (id) {
    delete this.subjectListItems[id]
  }

  has (id) {
    return !!this.subjectListItems[id]
  }
}

module.exports = SubjectList
