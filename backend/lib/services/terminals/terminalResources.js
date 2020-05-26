
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

const { Resources } = require('../../kubernetes-client')

const COMPONENT_TERMINAL = 'dashboard-terminal'

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
  const resource = Resources.Endpoints
  const data = { subsets }

  return toResource({ resource, name, namespace, annotations, labels, ownerReferences, data })
}

function toTerminalResource ({ prefix, namespace, annotations, labels, ownerReferences, host, target }) {
  const resource = Resources.Terminal
  const data = { spec: { host, target } }

  return toResource({ resource, generateName: prefix, namespace, annotations, labels, ownerReferences, data })
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

function fromNodeResource ({ metadata, status = {} }) {
  const { name, creationTimestamp, labels } = metadata
  const version = _.get(status, 'nodeInfo.kubeletVersion')
  const conditions = _.get(status, 'conditions')
  const readyCondition = _.find(conditions, condition => condition.type === 'Ready')
  const readyStatus = _.get(readyCondition, 'status', 'UNKNOWN')
  return {
    metadata: {
      name,
      creationTimestamp
    },
    data: {
      kubernetesHostname: labels['kubernetes.io/hostname'],
      version,
      readyStatus
    }
  }
}

module.exports = {
  toIngressResource,
  toEndpointResource,
  toServiceResource,
  toTerminalResource,
  fromNodeResource
}
