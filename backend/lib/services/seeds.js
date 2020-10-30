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
const { Forbidden } = require('http-errors')
const authorization = require('./authorization')
const { getSeeds } = require('../cache')
const { isSeedUnreachable } = require('../utils')

function fromResource (seed) {
  const unreachable = isSeedUnreachable(seed)
  const metadata = {
    name: _.get(seed, 'metadata.name'),
    unreachable
  }

  const taints = _.get(seed, 'spec.taints')
  const unprotected = !_.find(taints, ['key', 'seed.gardener.cloud/protected'])
  const visible = !_.find(taints, ['key', 'seed.gardener.cloud/invisible'])
  const provider = _.get(seed, 'spec.provider')
  const volume = _.get(seed, 'spec.volume')
  const data = {
    volume,
    ...provider,
    visible,
    unprotected
  }

  return { metadata, data }
}

exports.list = async function ({ user }) {
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  const seeds = getSeeds()
  return _.map(seeds, fromResource)
}
