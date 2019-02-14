
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
const yaml = require('js-yaml')
const core = require('../kubernetes').core()

exports.list = async function ({ user, namespace = 'garden' }) {
  const { items } = await core.namespaces(namespace).configmaps.get({
    qs: {
      labelSelector: 'gardenextensions.sapcloud.io/role=addonDefinitions'
    }
  })
  return _
    .chain(items)
    .first()
    .get('data')
    .map((data, name) => {
      try {
        return _.set(yaml.safeLoad(data), 'name', name)
      } catch (err) { /* ignore error */ }
    })
    .compact()
    .value()
}
