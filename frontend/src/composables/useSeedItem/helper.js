//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'

export function isFailureToleranceTypeZoneSupported (seedItem) {
  return get(seedItem, ['spec', 'provider', 'zones'], []).length >= 3
}
