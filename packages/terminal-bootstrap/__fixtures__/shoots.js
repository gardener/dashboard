//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

const {
  seedName,
  soilName,
  seedWithoutSecretRefName,
  unreachableSeedName
} = require('./constants')

function getShoot ({
  project = 'foo',
  name,
  uid,
  seedName,
  progress
}) {
  const metadata = {
    namespace: project === 'garden'
      ? 'garden'
      : `garden-${project}`,
    name,
    uid
  }
  const spec = {
    seedName
  }
  const status = {
    technicalID: `shoot--${project}--${name}`
  }
  if (typeof progress === 'number') {
    status.lastOperation = { progress }
  }
  return { kind: 'Shoot', metadata, spec, status }
}

const shootList = [
  getShoot({ name: 'bar', uid: '1', seedName, progress: 5 }),
  getShoot({ name: 'baz', uid: '2', seedName, progress: 50 }),
  getShoot({ name: 'dummy', uid: '3', seedName: seedWithoutSecretRefName, progress: 50 }),
  getShoot({ name: 'unreachable', uid: '4', seedName: unreachableSeedName, progress: 50 }),
  getShoot({ name: seedName, uid: '5', seedName: soilName, project: 'garden' }),
  getShoot({ name: 'foo', uid: '6', seedName: soilName, project: 'garden' })
]

const shoots = {
  create (options) {
    return getShoot(options)
  },
  get (namespace, name) {
    return find(shoots.list(), { metadata: { namespace, name } })
  },
  list () {
    return cloneDeep(shootList)
  }
}

module.exports = shoots
