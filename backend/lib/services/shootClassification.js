//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  compact,
  flatMap,
  uniq,
} from 'lodash-es'
import cache from '../cache/index.js'
import config from '../config/index.js'
import logger from '../logger/index.js'
import { isTruthyValue } from '../utils/index.js'

// Each bit marks a category of shoots that the Operations View can exclude from the unhealthy
// shoots. An unhealthy filter mask uses the same bits, and each set bit excludes its category:
//   1 (001) — the shoot status is 'progressing'
//   2 (010) — no operator action is required (ignored issues, temporary errors, or user-caused errors)
//   4 (100) — all open tickets of the shoot carry a hide label
const FILTER_PROGRESSING = 1
const FILTER_NO_OPERATOR_ACTION = 2
const FILTER_HIDE_TICKETS = 4
const ALL_UNHEALTHY_FILTER_FLAGS = FILTER_PROGRESSING | FILTER_NO_OPERATOR_ACTION | FILTER_HIDE_TICKETS

// Keep this derived classification in sync with frontend/src/utils/errorCodes.js
// (`userError` / `temporaryError` flags).
const userErrorCodes = new Set([
  'ERR_INFRA_UNAUTHENTICATED',
  'ERR_INFRA_UNAUTHORIZED',
  'ERR_INFRA_QUOTA_EXCEEDED',
  'ERR_INFRA_DEPENDENCIES',
  'ERR_CLEANUP_CLUSTER_RESOURCES',
  'ERR_INFRA_RESOURCES_DEPLETED',
  'ERR_CONFIGURATION_PROBLEM',
  'ERR_RETRYABLE_CONFIGURATION_PROBLEM',
  'ERR_PROBLEMATIC_WEBHOOK',
])

const temporaryErrorCodes = new Set([
  'ERR_INFRA_RATE_LIMITS_EXCEEDED',
  'ERR_RETRYABLE_INFRA_DEPENDENCIES',
])

function exclusionBits (shoot) {
  let bits = 0
  if (isStatusProgressing(shoot)) {
    bits |= FILTER_PROGRESSING
  }
  if (hasNoOperatorActionRequired(shoot)) {
    bits |= FILTER_NO_OPERATOR_ACTION
  }
  if (hasOnlyTicketsWithHideLabel(shoot)) {
    bits |= FILTER_HIDE_TICKETS
  }
  return bits
}

function shouldCountAsUnhealthy (shoot, unhealthyFilterMask) {
  if (isFilterEnabled(unhealthyFilterMask, FILTER_PROGRESSING) && isStatusProgressing(shoot)) {
    return false
  }
  if (isFilterEnabled(unhealthyFilterMask, FILTER_NO_OPERATOR_ACTION) && hasNoOperatorActionRequired(shoot)) {
    return false
  }
  if (isFilterEnabled(unhealthyFilterMask, FILTER_HIDE_TICKETS) && hasOnlyTicketsWithHideLabel(shoot)) {
    return false
  }
  return true
}

function isFilterEnabled (mask, flag) {
  return (mask & flag) !== 0
}

function isStatusProgressing (shoot) {
  return shoot?.metadata?.labels?.['shoot.gardener.cloud/status'] === 'progressing'
}

function hasNoOperatorActionRequired (shoot) {
  if (isTruthyValue(shoot?.metadata?.annotations?.['dashboard.gardener.cloud/ignore-issues'])) {
    return true
  }

  const lastErrorCodes = errorCodesFromArray(shoot?.status?.lastErrors)
  if (hasAnyTemporaryError(lastErrorCodes)) {
    return true
  }

  if (hasAnyUserError(lastErrorCodes)) {
    return true
  }

  if (hasAnyUserError(errorCodesFromArray(shoot?.status?.conditions))) {
    return true
  }

  return hasAnyUserError(errorCodesFromArray(shoot?.status?.constraints))
}

function hasOnlyTicketsWithHideLabel (shoot) {
  const hideClustersWithLabels = config.frontend?.ticket?.hideClustersWithLabels
  if (!Array.isArray(hideClustersWithLabels) || hideClustersWithLabels.length === 0) {
    return false
  }

  const ticketsForShoot = getTicketsForShoot(shoot)
  if (ticketsForShoot.length === 0) {
    return false
  }

  return ticketsForShoot.every(ticket => {
    const labelNames = ticket?.data?.labels?.map(({ name }) => name) ?? []
    return hideClustersWithLabels.some(label => labelNames.includes(label))
  })
}

function getTicketsForShoot (shoot) {
  const projectName = getProjectNameForShoot(shoot)
  const shootName = shoot?.metadata?.name
  if (!projectName || !shootName) {
    return []
  }

  return cache
    .getTicketCache()
    .getIssuesForShoot({ projectName, name: shootName })
}

function getProjectNameForShoot (shoot) {
  const namespace = shoot?.metadata?.namespace
  if (!namespace) {
    return
  }
  try {
    const project = cache.findProjectByNamespace(namespace)
    return project?.metadata?.name
  } catch (err) {
    logger.warn('Failed to resolve project for namespace %s: %s', namespace, err.message)
    return undefined
  }
}

function errorCodesFromArray (items = []) {
  return uniq(compact(flatMap(items, 'codes')))
}

function hasAnyUserError (codes = []) {
  return codes.some(code => userErrorCodes.has(code))
}

function hasAnyTemporaryError (codes = []) {
  return codes.some(code => temporaryErrorCodes.has(code))
}

export {
  FILTER_PROGRESSING,
  FILTER_NO_OPERATOR_ACTION,
  FILTER_HIDE_TICKETS,
  ALL_UNHEALTHY_FILTER_FLAGS,
  exclusionBits,
  shouldCountAsUnhealthy,
}
