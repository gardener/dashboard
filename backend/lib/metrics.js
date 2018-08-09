//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const prometheusClient = require('prom-client')
const kubernetes = require('./kubernetes')
const logger = require('./logger')
const rbac = kubernetes.rbac()
const { chain, startsWith } = require('lodash')

const { register, Gauge } = prometheusClient
const emailRegex = /(^$|^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$)/
const numberOfUsersQuery = {
  labelSelector: 'garden.sapcloud.io/role=members'
}
const usersGauge = new Gauge({
  name: 'garden_users_total',
  help: 'Total number of gardener users'
})

function main ({timeout = 30000} = {}) {
  prometheusClient.collectDefaultMetrics({ timeout })

  setInterval(async () => {
    try {
      usersGauge.set(await getNumberOfUsers(), Date.now())
    } catch (err) {
      logger.error('Failed to get number of users', err)
    }
  }, 30 * 1000)

  return register
}

function subjectFilter ({kind, name} = {}) {
  return kind === 'User' && emailRegex.test(name) && !startsWith(name, 'system:serviceaccount:')
}

async function getNumberOfUsers () {
  return chain(await rbac.rolebindings.get({qs: numberOfUsersQuery}))
    .get('items')
    .map('subjects')
    .flatten()
    .compact()
    .filter(subjectFilter)
    .map('name')
    .uniq()
    .size()
    .value()
}

module.exports = main
