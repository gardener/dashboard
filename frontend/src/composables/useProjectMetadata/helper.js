//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { annotations } from '@/utils/annotations.js'

import get from 'lodash/get'

export function getProjectTitle (project) {
  const title = get(project, ['metadata', 'annotations', annotations.projectTitle])
  return title?.trim()
}
