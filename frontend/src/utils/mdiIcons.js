//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  names,
  aliasMap,
} from 'virtual:g-mdi-meta'

export const mdiIcons = names
export const mdiAliasMap = aliasMap
export const mdiIconSet = new Set(names)

export function isMdiIcon (name) {
  return mdiIconSet.has(name)
}
