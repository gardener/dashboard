
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

const path = require('path')
const _ = require('lodash')
const { NotFound } = require('../errors')

function resolve (pathname) {
  return path.resolve(__dirname, '../..', pathname)
}

function decodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'utf8').toString('base64')
}

const config = {
  getCloudProviderKindList () {
    return ['aws', 'azure', 'gcp', 'openstack', 'alicloud']
  }
}

function getCloudProviderKind (object) {
  const cloudProviderKinds = config.getCloudProviderKindList()
  return _.head(_.intersection(_.keys(object), cloudProviderKinds))
}

function shootHasIssue (shoot) {
  return _.get(shoot, ['metadata', 'labels', 'shoot.garden.sapcloud.io/status'], 'healthy') !== 'healthy'
}

async function getProjectByNamespace (projects, namespaces, namespace) {
  const ns = await namespaces.get({ name: namespace })
  const name = _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
  if (!name) {
    throw new NotFound(`Namespace '${namespace}' is not related to a gardener project`)
  }
  return projects.get({ name })
}

module.exports = {
  resolve,
  decodeBase64,
  encodeBase64,
  getCloudProviderKind,
  shootHasIssue,
  getProjectByNamespace,
  _config: config
}
