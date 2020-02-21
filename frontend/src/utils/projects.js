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

import find from 'lodash/find'
import { getDateFormatted } from '@/utils'
import store from '../store'
import map from 'lodash/map'
import get from 'lodash/get'

export function projectFromProjectList () {
  const predicate = project => project.metadata.namespace === store.state.namespace
  return find(store.getters.projectList, predicate) || {}
}

export function projectNamesFromProjectList () {
  return map(store.getters.projectList, 'metadata.name')
}

export function getProjectDetails (project) {
  const projectData = project.data || {}
  const projectMetadata = project.metadata || {}
  const projectName = projectMetadata.name || ''
  const technicalContact = projectData.owner || ''
  const costObject = get(project, ['metadata', 'annotations', 'billing.gardener.cloud/costObject'])
  const creationTimestamp = projectMetadata.creationTimestamp
  const createdAt = getDateFormatted(creationTimestamp)
  const description = projectData.description || ''
  const createdBy = projectData.createdBy || ''
  const purpose = projectData.purpose || ''

  return {
    projectName,
    technicalContact,
    costObject,
    createdAt,
    creationTimestamp,
    createdBy,
    description,
    purpose
  }
}

export function getCostObjectSettings () {
  const costObject = store.state.cfg.costObject
  if (!costObject) {
    return undefined
  }

  const title = costObject.title || ''
  const description = costObject.description || ''
  const regex = costObject.regex
  const errorMessage = costObject.errorMessage

  return {
    regex,
    title,
    description,
    errorMessage
  }
}
