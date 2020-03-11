//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const resourceGroups = _
  .chain(require('../groups'))
  .mapKeys(({ group }) => group || 'core')
  .mapValues(loadGroup)
  .value()

function loadGroup ({ name }) {
  const resources = require(`./${name}`)
  return _.mapKeys(resources, 'names.plural')
}

function load (options) {
  const createInstance = Ctor => new Ctor({ ...options, responseType: 'json' })
  const createInstances = resourceGroup => _.mapValues(resourceGroup, createInstance)
  return _.mapValues(resourceGroups, createInstances)
}

function getResourceMetadata (Resource) {
  const { group, version, names: { plural, kind } } = Resource
  return {
    name: plural,
    kind,
    apiVersion: group === '' ? version : `${group}/${version}`
  }
}

function getResourceGroupMetadata (resources, resourceGroup) {
  return _
    .chain(resourceGroup)
    .mapKeys('names.kind')
    .mapValues(getResourceMetadata)
    .assign(resources)
    .value()
}

exports.Resources = _.reduce(resourceGroups, getResourceGroupMetadata, {})

exports.assign = (object, options = {}) => {
  return Object.assign(object, load(options))
}
