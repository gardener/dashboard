//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { Forbidden } = require('http-errors')
const authorization = require('./authorization')
const { getSeeds } = require('../cache')
const { simplifySeed } = require('../utils')

exports.list = async function ({ user }) {
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  return _
    .chain(getSeeds())
    .map(_.cloneDeep)
    .map(simplifySeed)
    .value()
}
