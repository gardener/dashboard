//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { maxLength } from '@vuelidate/validators'

export function truncateProjectTitle (title, maxLength = 64) {
  if (title.length > maxLength) {
    return title.slice(0, maxLength) + '…'
  }
  return title
}

export const projectTitleRules = {
  maxLength: maxLength(64),
}
