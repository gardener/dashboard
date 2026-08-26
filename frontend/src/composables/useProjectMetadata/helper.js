//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { annotations } from '@/utils/annotations.js'

import get from 'lodash/get'

export function getProjectTitle (project) {
  const title = get(project, ['metadata', 'annotations', annotations.projectTitle])
  return title?.trim()
}

export function formatProjectNameAndTitle (name, title) {
  return title ? `${name} — ${title}` : name
}
