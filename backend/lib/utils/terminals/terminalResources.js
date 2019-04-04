
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

const kubernetes = require('../../kubernetes')
const Resources = kubernetes.Resources
const { encodeBase64 } = require('..')
const { UnprocessableEntity } = require('../../errors')

const COMPONENT_TERMINAL = 'dashboard-terminal'

function toClusterRoleResource ({
  name,
  rules,
  labels = {},
  annotations = {},
  ownerReferences = []
}) {
  const resource = Resources.ClusterRole
  const data = { rules }

  return toResource({ resource, name, annotations, labels, ownerReferences, data })
}

function toClusterRoleBindingResource ({
  name,
  roleRef,
  subjects,
  annotations = {},
  labels = {},
  ownerReferences = []
}) {
  const resource = Resources.ClusterRoleBinding
  const data = { roleRef, subjects }

  return toResource({ resource, name, annotations, labels, ownerReferences, data })
}

function toRoleBindingResource ({
  name,
  annotations = {},
  labels = {},
  subjects,
  roleRef,
  ownerReferences
}) {
  const resource = Resources.RoleBinding
  const data = { roleRef, subjects }

  return toResource({ resource, name, annotations, labels, ownerReferences, data })
}

function toServiceAccountResource ({
  prefix,
  name,
  labels = {},
  annotations = {},
  ownerReferences = []
}) {
  const resource = Resources.ServiceAccount
  const generateName = prefix

  return toResource({ resource, name, generateName, annotations, labels, ownerReferences })
}

function toCronjobResource ({
  name,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.CronJob
  const data = { spec }

  return toResource({ resource, name, annotations, labels, ownerReferences, data })
}

function toIngressResource ({
  name,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Ingress
  const data = { spec }

  return toResource({ resource, name, annotations, labels, ownerReferences, data })
}

function toServiceResource ({
  name,
  namespace,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Service
  const data = { spec }

  return toResource({ resource, name, namespace, annotations, labels, ownerReferences, data })
}

function toEndpointResource ({
  name,
  namespace,
  subsets,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Endpoint
  const data = { subsets }

  return toResource({ resource, name, namespace, annotations, labels, ownerReferences, data })
}

function toPodResource ({
  name,
  namespace,
  annotations,
  labels,
  spec,
  ownerReferences
}) {
  const resource = Resources.Pod
  const data = { spec }

  return toResource({ resource, name, namespace, annotations, labels, ownerReferences, data })
}

function toSecretResource ({ name, namespace, annotations, labels, ownerReferences, rawData }) {
  const resource = Resources.Secret
  let encodedData
  try {
    encodedData = _.mapValues(rawData, encodeBase64)
  } catch (err) {
    throw new UnprocessableEntity('Failed to encode "base64" secret data')
  }
  const data = {
    type: 'Opaque',
    data: encodedData
  }
  return toResource({ resource, name, namespace, annotations, labels, ownerReferences, data })
}

function toResource ({
  resource,
  name,
  generateName,
  namespace,
  annotations = {},
  labels = {},
  ownerReferences,
  data
}) {
  const apiVersion = resource.apiVersion
  const kind = resource.kind

  labels.component = COMPONENT_TERMINAL

  const metadata = {
    labels,
    annotations,
    ownerReferences
  }
  if (name) {
    metadata.name = name
  }
  if (generateName) {
    metadata.generateName = generateName
  }
  if (namespace) {
    metadata.namespace = namespace
  }

  const resourceBody = {
    apiVersion,
    kind,
    metadata
  }
  _.assign(resourceBody, data)

  return resourceBody
}

module.exports = {
  COMPONENT_TERMINAL,
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource,
  toIngressResource,
  toEndpointResource,
  toServiceResource,
  toPodResource,
  toSecretResource
}
