
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
const yaml = require('js-yaml')
const { NotFound } = require('../errors')

function resolve (pathname) {
  return path.resolve(__dirname, '../..', pathname)
}

function cleanKubeconfig (input) {
  const cleanCluster = ({ name, cluster }) => {
    cluster = _.pick(cluster, ['server', 'insecure-skip-tls-verify', 'certificate-authority-data'])
    return { name, cluster }
  }
  const cleanContext = ({ name, context }) => {
    context = _.pick(context, ['cluster', 'user', 'namespace'])
    return { name, context }
  }
  const cleanAuthInfo = ({ name, user }) => {
    user = _.pick(user, ['client-certificate-data', 'client-key-data', 'token', 'username', 'password'])
    return { name, user }
  }
  const cleanConfig = ({
    clusters,
    contexts,
    'current-context': currentContext,
    users
  }) => {
    return {
      clusters: _.map(clusters, cleanCluster),
      contexts: _.map(contexts, cleanContext),
      'current-context': currentContext,
      users: _.map(users, cleanAuthInfo)
    }
  }
  if (_.isString(input)) {
    input = yaml.safeLoad(input)
  }
  return cleanConfig(input)
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
  cleanKubeconfig,
  resolve,
  decodeBase64,
  encodeBase64,
  shootHasIssue,
  getProjectByNamespace
}
