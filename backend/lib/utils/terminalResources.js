
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

const _ = require('lodash')

const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources

function toClusterRoleResource ({
  name,
  component,
  rules,
  labels = {},
  annotations = {},
  ownerReferences = []
}) {
  const resource = Resources.ClusterRole
  const data = { rules }

  return toResource({ resource, name, component, annotations, labels, ownerReferences, data })
}

function toClusterRoleBindingResource ({
  name,
  clusterRoleName,
  component,
  saName,
  saNamespace,
  annotations = {},
  labels = {},
  ownerReferences = []
}) {
  const resource = Resources.ClusterRoleBinding
  const roleRef = {
    apiGroup: Resources.ClusterRole.apiGroup,
    kind: Resources.ClusterRole.kind,
    name: clusterRoleName
  }

  const subjects = [
    {
      kind: Resources.ServiceAccount.kind,
      name: saName,
      namespace: saNamespace
    }
  ]
  const data = { roleRef, subjects }

  return toResource({ resource, name, component, annotations, labels, ownerReferences, data })
}

function toServiceAccountResource ({
  prefix,
  name,
  component,
  labels = {},
  annotations = {},
  ownerReferences = []
}) {
  const resource = Resources.ServiceAccount
  const generateName = prefix

  return toResource({ resource, name, generateName, component, annotations, labels, ownerReferences })
}

function toCronjobResource ({
  name,
  component,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.CronJob
  const data = { spec }

  return toResource({ resource, name, component, annotations, labels, ownerReferences, data })
}

function toIngressResource ({
  name,
  component,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Ingress
  const data = { spec }

  return toResource({ resource, name, component, annotations, labels, ownerReferences, data })
}

function toServiceResource ({
  name,
  namespace,
  component,
  spec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Service
  const data = { spec }

  return toResource({ resource, name, namespace, component, annotations, labels, ownerReferences, data })
}

function toEndpointResource ({
  name,
  namespace,
  component,
  subsets,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const resource = Resources.Endpoint
  const data = { subsets }

  return toResource({ resource, name, namespace, component, annotations, labels, ownerReferences, data })
}

function toPodResource ({
  name,
  namespace,
  component,
  annotations,
  labels,
  spec,
  ownerReferences
}) {
  const resource = Resources.Pod
  const data = { spec }

  return toResource({ resource, name, namespace, component, annotations, labels, ownerReferences, data })
}

function toResource ({
  resource,
  name,
  generateName,
  namespace,
  component,
  annotations = {},
  labels = {},
  ownerReferences,
  data
}) {
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  labels.component = component

  const metadata = { labels, annotations, ownerReferences }
  if (name) {
    metadata.name = name
  }
  if (generateName) {
    metadata.generateName = generateName
  }
  if (namespace) {
    metadata.namespace = namespace
  }

  const resourceBody = { apiVersion, kind, metadata }

  _.assign(resourceBody, data)

  return resourceBody
}

module.exports = {
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource,
  toIngressResource,
  toEndpointResource,
  toServiceResource,
  toPodResource
}
