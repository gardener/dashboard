//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import SubjectListItem from './SubjectListItem.js'

class SubjectList {
  constructor (project, serviceAccounts) {
    const {
      spec: {
        namespace,
        members: subjects,
      },
    } = project
    const createServiceAccountItem = ({ metadata, secrets }) => {
      const { namespace, name, annotations = {}, creationTimestamp, deletionTimestamp } = metadata
      const createdByTerminal = annotations['terminal.dashboard.gardener.cloud/created-by']
      const createdBy = annotations['dashboard.gardener.cloud/created-by'] || createdByTerminal
      const description = annotations['dashboard.gardener.cloud/description']
      const item = SubjectListItem.create({
        kind: 'ServiceAccount',
        namespace,
        name,
      })
      item.extend({
        createdBy,
        description,
        creationTimestamp,
        deletionTimestamp,
        secrets,
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
        const serviceAccountItem = serviceAccountItemMap.get(id)
        if (serviceAccountItem) {
          Object.assign(extensions, serviceAccountItem.extensions)
          serviceAccountItemMap.delete(id)
        } else {
          extensions.orphaned = true
        }
        item.extend(extensions)
      }
    }

    const toMap = obj => new Map(Object.entries(obj))

    const serviceAccountItemMap = _
      .chain(serviceAccounts)
      .map(createServiceAccountItem)
      .keyBy('id')
      .thru(toMap)
      .value()

    const subjectListItemMap = _
      .chain(subjects)
      .map(createItem)
      .groupBy('id')
      .mapValues(createGroup)
      .forEach(extendItem)
      .thru(toMap)
      .value()

    this.subjectListItemMap = new Map([
      ...subjectListItemMap,
      ...serviceAccountItemMap,
    ])
  }

  get subjectListItems () {
    return Object.fromEntries(this.subjectListItemMap)
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
    return this.subjectListItemMap.get(id)
  }

  set (id, item) {
    this.subjectListItemMap.set(id, item)
  }

  delete (id) {
    this.subjectListItemMap.delete(id)
  }

  has (id) {
    return this.subjectListItemMap.has(id)
  }
}

export default SubjectList
