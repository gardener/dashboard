
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
  const apiVersion = Resources.ClusterRole.apiVersion
  const kind = Resources.ClusterRole.kind
  labels.component = component

  const metadata = { name, labels, annotations, ownerReferences }
  return { apiVersion, kind, metadata, rules }
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
  const apiVersion = Resources.ClusterRoleBinding.apiVersion
  const kind = Resources.ClusterRoleBinding.kind
  labels.component = component

  const metadata = { name, labels, annotations, ownerReferences }

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

  return { apiVersion, kind, metadata, roleRef, subjects }
}

function toServiceAccountResource ({
  prefix,
  name,
  component,
  labels = {},
  annotations = {},
  ownerReferences = []
}) {
  const apiVersion = Resources.ServiceAccount.apiVersion
  const kind = Resources.ServiceAccount.kind
  labels.component = component

  const metadata = { labels, annotations, ownerReferences }
  if (name) {
    metadata.name = name
  } else {
    metadata.generateName = prefix
  }

  return { apiVersion, kind, metadata }
}

function toCronjobResource ({
  name,
  component,
  cronSpec,
  annotations = {},
  ownerReferences = [],
  labels = {}
}) {
  const apiVersion = Resources.CronJob.apiVersion
  const kind = Resources.CronJob.kind
  labels.component = component

  const metadata = { name, labels, annotations, ownerReferences }

  return { apiVersion, kind, metadata, spec: cronSpec }
}

module.exports = {
  toClusterRoleResource,
  toClusterRoleBindingResource,
  toServiceAccountResource,
  toCronjobResource
}
