//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'

export function isFailureToleranceTypeZoneSupported (seedItem) {
  return get(seedItem, ['spec', 'provider', 'zones'], []).length >= 3
}

export function getBestSupportedFailureToleranceType (seedItem) {
  return isFailureToleranceTypeZoneSupported(seedItem)
    ? 'zone'
    : 'node'
}
