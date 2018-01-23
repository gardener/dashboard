//
// Copyright 2018 by The Gardener Authors.
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

const Resources = require('../kubernetes/Resources')

function fromResource ({metadata}) {
  const annotations = metadata.annotations || {}
  const labels = metadata.labels || {}
  const role = 'project'
  const resourceVersion = metadata.resourceVersion
  const namespace = metadata.name
  const name = labels['project.garden.sapcloud.io/name'] || namespace.replace(/^garden-/, '')
  const creationTimestamp = metadata.creationTimestamp
  metadata = {name, namespace, resourceVersion, role, creationTimestamp}
  const data = {
    createdBy: annotations['project.garden.sapcloud.io/createdBy'],
    owner: annotations['project.garden.sapcloud.io/owner'],
    description: annotations['project.garden.sapcloud.io/description'],
    purpose: annotations['project.garden.sapcloud.io/purpose']
  }
  return {metadata, data}
}
exports.fromResource = fromResource

function toResource ({metadata, data}) {
  const resource = Resources.Namespace
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const labels = {
    'garden.sapcloud.io/role': 'project',
    'project.garden.sapcloud.io/name': metadata.name
  }
  data = data || {}
  const annotations = {
    'project.garden.sapcloud.io/createdBy': data.createdBy,
    'project.garden.sapcloud.io/owner': data.owner,
    'project.garden.sapcloud.io/description': data.description,
    'project.garden.sapcloud.io/purpose': data.purpose
  }
  const name = metadata.namespace || `garden-${metadata.name}`
  const resourceVersion = metadata.resourceVersion
  metadata = {name, resourceVersion, labels, annotations}
  return {apiVersion, kind, metadata}
}
exports.toResource = toResource
