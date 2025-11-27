//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import kubeClientModule from '@gardener-dashboard/kube-client'
const { Resources } = kubeClientModule

const COMPONENT_TERMINAL = 'dashboard-terminal'

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
  data,
}) {
  const apiVersion = resource.apiVersion
  const kind = resource.kind

  labels.component = COMPONENT_TERMINAL

  const metadata = {
    labels,
    annotations,
    ownerReferences,
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
    metadata,
  }
  _.assign(resourceBody, data)

  return resourceBody
}

function fromNodeResource ({ metadata, status = {} }) {
  const { name, creationTimestamp, labels } = metadata
  const version = _.get(status, ['nodeInfo', 'kubeletVersion'])
  const conditions = _.get(status, ['conditions'])
  const readyCondition = _.find(conditions, condition => condition.type === 'Ready')
  const readyStatus = _.get(readyCondition, ['status'], 'UNKNOWN')
  return {
    metadata: {
      name,
      creationTimestamp,
    },
    data: {
      kubernetesHostname: labels['kubernetes.io/hostname'],
      version,
      readyStatus,
    },
  }
}

export {
  toTerminalResource,
  fromNodeResource,
}
