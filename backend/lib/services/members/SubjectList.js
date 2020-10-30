
//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const _ = require('lodash')

const SubjectListItem = require('./SubjectListItem')

class SubjectList {
  constructor (subjects, serviceAccounts) {
    const createServiceAccountItem = ({ metadata, secrets }) => {
      const { namespace, name, annotations = {}, creationTimestamp } = metadata
      const createdByLegacy = annotations['garden.sapcloud.io/createdBy']
      const createdByTerminal = annotations['terminal.dashboard.gardener.cloud/created-by']
      const createdBy = annotations['dashboard.gardener.cloud/created-by'] || createdByLegacy || createdByTerminal
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
      if (serviceAccountItems[id]) {
        item.extend(serviceAccountItems[id].extensions)
        delete serviceAccountItems[id]
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
