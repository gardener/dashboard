//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import {
  compact,
  flatMap,
  uniq,
} from 'lodash-es'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import config from '../config/index.js'
import logger from '../logger/index.js'
import {
  isTruthyValue,
  shootHasIssue,
} from '../utils/index.js'

const { Forbidden, NotFound, UnprocessableEntity } = httpErrors

const apiVersion = 'dashboard.gardener.cloud/v1alpha1'
const kind = 'SeedStat'

// unhealthyFilterMask is a bitmask controlling which unhealthy shoots are counted
// in unhealthyShoots.matching. Each set bit *excludes* a category from matching:
//   0 (000) — no filter: matching === total (every unhealthy shoot counts)
//   1 (001) — exclude shoots whose status is 'progressing'
//   2 (010) — exclude shoots where no operator action is required
//             (ignored issues, temporary errors, or user-caused errors)
//   4 (100) — exclude shoots whose only open tickets carry the hide label
// Bits may be combined freely; 7 (111) gives the most filtered view.
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

async function list ({ user, unhealthyFilterMask }) {
  await ensureAccess(user)

  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)

  const seeds = cache.getSeeds()
  const statsMap = getSeedStatsMap(seeds, unhealthyFilterMask)

  return seeds.map(seed => toSeedStat(seed, statsMap.get(seed.metadata.name)))
}

async function read ({ user, name, unhealthyFilterMask }) {
  await ensureAccess(user)

  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)

  const seed = cache.getSeed(name)
  if (!seed) {
    throw new NotFound(`Seed with name '${name}' not found`)
  }

  const counts = getCountsForSeedName(name, unhealthyFilterMask)
  return toSeedStat(seed, counts)
}

function getByUids (uids, unhealthyFilterMask) {
  unhealthyFilterMask = parseUnhealthyFilterMask(unhealthyFilterMask)
  return uids.map(uid => {
    const seed = cache.getSeedByUid(uid)
    if (!seed) {
      return undefined
    }
    const counts = getCountsForSeedName(seed.metadata.name, unhealthyFilterMask)
    return toSeedStat(seed, counts)
  })
}

function toSeedStat (seed, counts = emptyCounts()) {
  return {
    apiVersion,
    kind,
    metadata: {
      name: seed.metadata.name,
      uid: seed.metadata.uid,
    },
    counts: {
      shootCount: counts.shootCount ?? 0,
      unhealthyShoots: {
        total: counts.unhealthyShoots?.total ?? 0,
        matching: counts.unhealthyShoots?.matching ?? 0,
      },
    },
  }
}

function getSeedStatsMap (seeds, unhealthyFilterMask) {
  const statsMap = new Map()
  for (const seed of seeds) {
    const counts = getCountsForSeedName(seed.metadata.name, unhealthyFilterMask)
    statsMap.set(seed.metadata.name, counts)
  }
  return statsMap
}

function getCountsForSeedName (seedName, unhealthyFilterMask) {
  const counts = emptyCounts()
  for (const shoot of cache.getShootsBySeedName(seedName)) {
    countShoot(counts, shoot, unhealthyFilterMask)
  }
  return counts
}

function emptyCounts () {
  return {
    shootCount: 0,
    unhealthyShoots: {
      total: 0,
      matching: 0,
    },
  }
}

function countShoot (counts, shoot, unhealthyFilterMask) {
  counts.shootCount += 1
  if (!shootHasIssue(shoot)) {
    return
  }

  counts.unhealthyShoots.total += 1
  if (shouldCountAsUnhealthy(shoot, unhealthyFilterMask)) {
    counts.unhealthyShoots.matching += 1
  }
}

async function ensureAccess (user) {
  const [canListSeeds, canListAllShoots] = await Promise.all([
    authorization.canListSeeds(user),
    authorization.canListShoots(user),
  ])

  if (!canListSeeds || !canListAllShoots) {
    throw new Forbidden('You are not allowed to list seed stats')
  }
}

function parseUnhealthyFilterMask (unhealthyFilterMask) {
  if (typeof unhealthyFilterMask === 'undefined') {
    throw invalidUnhealthyFilterMask()
  }

  if (typeof unhealthyFilterMask === 'string') {
    unhealthyFilterMask = Number(unhealthyFilterMask)
  }

  if (!isValidUnhealthyFilterMask(unhealthyFilterMask)) {
    throw invalidUnhealthyFilterMask()
  }

  return unhealthyFilterMask
}

function isValidUnhealthyFilterMask (value) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    (value & ~ALL_UNHEALTHY_FILTER_FLAGS) === 0 // rejects negatives and any bits not in 0b111 (7)
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
    .getIssues()
    .filter(issue => issue?.metadata?.projectName === projectName && issue?.metadata?.name === shootName)
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

function invalidUnhealthyFilterMask () {
  return new UnprocessableEntity(`The 'unhealthyFilterMask' query parameter must be a non-negative integer with no bits set outside the known flags (0–${ALL_UNHEALTHY_FILTER_FLAGS})`)
}

export {
  FILTER_PROGRESSING,
  FILTER_NO_OPERATOR_ACTION,
  FILTER_HIDE_TICKETS,
  list,
  read,
  getByUids,
  parseUnhealthyFilterMask,
  shouldCountAsUnhealthy,
}
